import { EmailService } from '../src/services/email.service';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';

async function testAdminEmail() {
  console.log('Sending live Admin Confirmation & Activation Email with CTA Button...');
  const targetEmail = 'izallstorage28@gmail.com';

  const mockToken = jwt.sign(
    { userId: 'test-admin-id-123', email: targetEmail, purpose: 'ADMIN_ACTIVATION' },
    env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  const success = await EmailService.sendAdminConfirmationEmail(
    targetEmail,
    mockToken,
    'AdminPass123!@#',
    'admin.super@stas-rg.ac.id'
  );

  if (success) {
    console.log('🎉 LIVE ADMIN EMAIL SENT SUCCESSFULLY to:', targetEmail);
  } else {
    console.error('❌ Failed to send live admin email.');
  }
}

testAdminEmail();
