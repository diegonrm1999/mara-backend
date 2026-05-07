import { Injectable } from '@nestjs/common';
import { GoogleAuth } from 'google-auth-library';
import axios from 'axios';
import * as fs from 'fs';

@Injectable()
export class FcmService {
  private readonly projectId = 'dukarmo';
  private auth: GoogleAuth;

  constructor() {
    let credentials;

    if (process.env.FIREBASE_CREDENTIALS_BASE64) {
      const decoded = Buffer.from(
        process.env.FIREBASE_CREDENTIALS_BASE64,
        'base64',
      ).toString('utf8');
      credentials = JSON.parse(decoded);
    } else {
      try {
        if (fs.existsSync('secrets/firebase-service-account.json')) {
          credentials = JSON.parse(
            fs.readFileSync('secrets/firebase-service-account.json', 'utf8'),
          );
        } else {
          console.warn('Firebase credentials not found. FCM will be disabled.');
        }
      } catch (error) {
        console.warn('Could not read firebase credentials.', error);
      }
    }

    if (credentials) {
      this.auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
      });
    }
  }

  private async getAccessToken(): Promise<string> {
    if (!this.auth) return '';
    const client = await this.auth.getClient();
    const tokenResponse = await client.getAccessToken();
    return tokenResponse.token!;
  }

  async sendToTopic(topic: string, title: string, body: string, data = {}) {
    if (!this.auth) {
      console.warn('FCM is disabled. Message not sent:', { topic, title });
      return;
    }
    const accessToken = await this.getAccessToken();

    const url = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;

    const message = {
      message: {
        topic,
        notification: { title, body },
        data,
      },
    };

    try {
      const res = await axios.post(url, message, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return res.data;
    } catch (err: any) {
      console.error('FCM ERROR:', err.response?.data || err.message);
      throw err;
    }
  }
}
