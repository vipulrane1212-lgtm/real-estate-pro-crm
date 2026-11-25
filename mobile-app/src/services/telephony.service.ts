import { Preferences } from '@capacitor/preferences';
import { APP_CONFIG } from '../config';

export interface InitiateCallParams {
  leadId: string;
  clientPhone: string;
  clientName: string;
}

class TelephonyService {
  /**
   * Initiates a Click-to-Call connection
   * Method 1: Cloud Telephony Bridge (Exotel/Twilio)
   * - Server dials employee's phone first, then dials client
   * - Masks private phone number
   * - Auto-records 100% of the conversation in cloud MP3
   *
   * Method 2: Native Device Dialer (fallback)
   */
  public async callClient({ leadId, clientPhone, clientName }: InitiateCallParams): Promise<{ success: boolean; mode: 'cloud_bridge' | 'native_dialer' }> {
    try {
      const token = await Preferences.get({ key: 'auth_token' });

      // 1. Attempt Cloud Telephony Bridge
      const res = await fetch(`${APP_CONFIG.API_BASE_URL}/api/calls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
        },
        body: JSON.stringify({
          lead_id: leadId,
          client_phone: clientPhone,
          trigger_live_dial: true,
          call_type: 'outgoing',
          notes: `Call initiated from Diksha Mobile App to ${clientName}`,
        }),
      });

      if (res.ok) {
        return { success: true, mode: 'cloud_bridge' };
      }
    } catch (err) {
      console.warn('Cloud bridge dialer fallback to native:', err);
    }

    // 2. Fallback: Launch native dialer on personal phone
    window.location.href = `tel:${clientPhone}`;
    return { success: true, mode: 'native_dialer' };
  }

  /**
   * Quick-logs call outcome from mobile app
   */
  public async logOutcome(params: {
    leadId: string;
    clientPhone: string;
    outcome: 'connected' | 'not_answered' | 'busy' | 'wrong_number';
    durationSeconds: number;
    notes: string;
  }) {
    const token = await Preferences.get({ key: 'auth_token' });
    return await fetch(`${APP_CONFIG.API_BASE_URL}/api/calls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
      },
      body: JSON.stringify(params),
    });
  }
}

export const telephonyService = new TelephonyService();
