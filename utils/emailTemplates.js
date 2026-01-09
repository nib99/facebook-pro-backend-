exports.emailVerificationTemplate = (username, verificationUrl) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify Your Email</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 40px; text-align: center; color: #333; }
    .content p { font-size: 16px; line-height: 1.6; margin: 20px 0; }
    .button { display: inline-block; padding: 15px 35px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 50px; font-weight: bold; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Facebook Pro!</h1>
    </div>
    <div class="content">
      <h2>Hello ${username},</h2>
      <p>Thanks for joining Facebook Pro! Please verify your email address to get started.</p>
      <a href="${verificationUrl}" class="button">Verify Email Address</a>
      <p>Or copy and paste this link:</p>
      <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
      <p>This link expires in 24 hours.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Facebook Pro. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

exports.passwordResetTemplate = (username, resetUrl) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Password</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 40px; text-align: center; }
    .content { padding: 40px; text-align: center; color: #333; }
    .button { display: inline-block; padding: 15px 35px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; text-decoration: none; border-radius: 50px; font-weight: bold; margin: 20px 0; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0; text-align: left; }
    .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <h2>Hi ${username},</h2>
      <p>We received a request to reset your password.</p>
      <a href="${resetUrl}" class="button">Reset Password</a>
      <p>Or copy and paste this link:</p>
      <p style="word-break: break-all; color: #f5576c;">${resetUrl}</p>
      <div class="warning">
        <strong>Security Notice:</strong> This link expires in 1 hour. If you didn't request this, ignore this email.
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Facebook Pro. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

exports.welcomeEmailTemplate = (username) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Facebook Pro!</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
    .content { padding: 40px; color: #333; }
    .feature { background: #f8f9fa; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }
    .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to Facebook Pro!</h1>
    </div>
    <div class="content">
      <h2>Hello ${username}!</h2>
      <p>Your account has been successfully verified. Welcome to the community!</p>
      <div class="feature">
        <strong>📝 Share Posts</strong><br>Share moments, photos, and updates
      </div>
      <div class="feature">
        <strong>👥 Connect</strong><br>Find and add friends
      </div>
      <div class="feature">
        <strong>💬 Chat</strong><br>Real-time messaging
      </div>
      <div class="feature">
        <strong>📱 Stories</strong><br>Share disappearing moments
      </div>
      <p>Start exploring and enjoy your experience!</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Facebook Pro</p>
    </div>
  </div>
</body>
</html>
`;
