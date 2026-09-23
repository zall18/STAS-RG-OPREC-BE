import { EmailService } from '../src/services/email.service';
import { env } from '../src/config/env';

async function testGmailSmtp() {
  console.log('Testing Gmail SMTP with credentials:');
  console.log('SMTP_HOST:', env.SMTP_HOST);
  console.log('SMTP_PORT:', env.SMTP_PORT);
  console.log('SMTP_USER:', env.SMTP_USER);

  const targetEmail = 'izallstorage28@gmail.com';
  const testOtp = '849201';

  console.log(`Sending live test OTP email to: ${targetEmail}...`);
  const success = await EmailService.sendOtpEmail(targetEmail, testOtp, 'REGISTRATION');

  if (success) {
    console.log('🎉 LIVE EMAIL SEND SUCCESS! Google SMTP accepted and delivered the message.');
  } else {
    console.error('❌ FAILED TO SEND EMAIL. Check logs above.');
  }
}

testGmailSmtp();
