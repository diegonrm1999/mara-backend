import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let errorType = 'InternalError';

    // Manejo de HttpException de NestJS (BadRequestException, NotFoundException, etc.)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exceptionResponse;
      errorType = 'HttpException';
    } 
    // Manejo de errores de Prisma
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      errorType = 'PrismaError';
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Violación de restricción de unicidad en la base de datos (registro duplicado).';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Registro no encontrado en la base de datos.';
      } else if (exception.code === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Violación de llave foránea.';
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = `Error de base de datos: ${exception.message}`;
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      errorType = 'PrismaValidationError';
      status = HttpStatus.BAD_REQUEST;
      message = 'Error de validación en la consulta de base de datos.';
    }
    // Manejo de Error estándar (usualmente lanzado manualmente en los services como `throw new Error(...)`)
    else if (exception instanceof Error) {
      errorType = 'BusinessLogicError';
      // Asumimos 400 Bad Request para errores de lógica de negocio lanzados manualmente
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
    }

    this.logger.error(
      `[${request.method}] ${request.url} - Status: ${status} - Type: ${errorType} - Message: ${JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(status).json({
      statusCode: status,
      errorType,
      message: Array.isArray(message) ? message[0] : message, // Simplificar arreglos de validación
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    });
  }
}
