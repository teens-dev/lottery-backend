

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587 
SMTP_USER=lavanyagali1272@gmail.com 
SMTP_PASS=yojpzcnbvohvdofz 
FROM_EMAIL="Lottery App <lavanyagali1272@gmail.com>"

SMTP (Simple Mail Transfer Protocol) is the system your backend uses to send emails to users or admins. When your app triggers an email (like “draw created”), it doesn’t send it directly—it hands it to an SMTP server (like Gmail), which delivers it to the recipient’s inbox.

SMTP_HOST (e.g., smtp.gmail.com) is the mail server provider, and SMTP_PORT (usually 587) defines a secure connection using TLS. SMTP_USER is your email address, and SMTP_PASS is a special app password used to authenticate securely without exposing your real password.

SMTP is used with Nodemailer so that when a draw is created, your backend connects to Gmail’s SMTP server and sends an email notification to all admins.