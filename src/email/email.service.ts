import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { PdfService } from 'src/pdf/pdf.service';
import { OrderReceiptData } from './dto/order-receipt.dto';

@Injectable()
export class EmailService {
  private sesClient: SESClient;
  private fromEmail: string;
  private fromName: string;
  private defaultReceiver: string;

  constructor(
    private configService: ConfigService,
    private pdfService: PdfService,
  ) {
    this.initializeSESClient();
  }

  private initializeSESClient(): void {
    try {
      const region = this.configService.get<string>('AWS_REGION', 'us-east-1');

      this.sesClient = new SESClient({
        region,
        credentials: {
          accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
          secretAccessKey: this.configService.get<string>(
            'AWS_SECRET_ACCESS_KEY',
          ),
        },
        // Optimizaciones de conexión
        maxAttempts: 3,
        requestHandler: {
          connectionTimeout: 5000,
          socketTimeout: 5000,
        },
      });

      this.fromEmail = this.configService.get<string>('AWS_SES_FROM_EMAIL');
      this.fromName = this.configService.get<string>('AWS_SES_FROM_NAME');
      this.defaultReceiver = this.configService.get<string>(
        'AWS_SES_DEFAULT_RECEIVER',
      );

      if (!this.fromEmail) {
        throw new Error('AWS_SES_FROM_EMAIL no está configurado');
      }
    } catch (error) {
      throw new Error('No se pudo configurar el servicio de email con SES');
    }
  }

  async sendOrderReceipt(receiptData: OrderReceiptData): Promise<void> {
    try {
      const pdfBuffer = await this.pdfService.generateReceiptPDF(receiptData);
      const rawEmail = this.createRawEmail(receiptData, pdfBuffer);
      const command = new SendRawEmailCommand({
        RawMessage: {
          Data: Buffer.from(rawEmail),
        },
      });
      await this.sesClient.send(command);
    } catch (error) {
      throw new Error(`Error al enviar el recibo: ${error.message}`);
    }
  }

  private createRawEmail(data: OrderReceiptData, pdfBuffer: Buffer): string {
    const boundary = `----=_Part_${Date.now()}`;
    const fromAddress = this.fromName
      ? `${this.fromName} <${this.fromEmail}>`
      : `${data.shopName} <${this.fromEmail}>`;

    const subjectEncoded = Buffer.from(
      `Boleta de Venta - ${data.shopName} - #${data.orderNumber}`,
    ).toString('base64');
    const pdfBase64 = pdfBuffer.toString('base64');
    const htmlBody = this.createSimpleEmailBody(data);

    const parts: string[] = [`From: ${fromAddress}`, `To: ${data.clientEmail}`];
    if (this.defaultReceiver) {
      parts.push(`Bcc: ${this.defaultReceiver}`);
    }
    parts.push(
      `Subject: =?UTF-8?B?${subjectEncoded}?=`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      htmlBody,
      '',
      `--${boundary}`,
      `Content-Type: application/pdf; name="boleta-${data.orderNumber}.pdf"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="boleta-${data.orderNumber}.pdf"`,
      '',
    );

    for (let i = 0; i < pdfBase64.length; i += 76) {
      parts.push(pdfBase64.slice(i, i + 76));
    }

    parts.push('', `--${boundary}--`);

    return parts.join('\r\n');
  }

  private createSimpleEmailBody(data: OrderReceiptData): string {
    return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><h2 style="color:#333;text-align:center">¡Gracias por su compra!</h2><div style="background-color:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0"><h3 style="color:#2c3e50;margin-top:0">Detalles de su compra:</h3><p><strong>Cliente:</strong> ${data.clientFirstName} ${data.clientLastName}</p><p><strong>Orden:</strong> #${data.orderNumber}</p><p><strong>Fecha:</strong> ${data.date} a las ${data.time}</p><p><strong>Total:</strong> ${data.currency}${data.totalPrice.toFixed(2)}</p></div><div style="background-color:#e8f4fd;padding:15px;border-radius:8px;border-left:4px solid #007bff"><p style="margin:0"><strong>📎 Su boleta está adjunta en este correo como archivo PDF.</strong></p><p style="margin:5px 0 0 0;font-size:14px;color:#666">Puede descargar e imprimir su boleta desde el archivo adjunto.</p></div><div style="text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid #eee"><h3 style="color:#2c3e50">${data.shopName}</h3><p style="color:#666;font-size:14px">${data.shopAddress1}</p><p style="color:#666;font-size:14px">${data.shopAddress2}</p><p style="color:#666;font-size:14px">${data.shopAddress3}</p><p style="color:#666;font-size:14px">Tel: ${data.shopPhone}</p></div><p style="text-align:center;margin-top:20px;color:#666;font-size:12px">¡Esperamos verle pronto nuevamente!</p></div>`;
  }
}
