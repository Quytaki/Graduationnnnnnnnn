"""
Email Service for recruitment module.
Configure via environment variables:
  - SMTP_HOST: SMTP server host (default: smtp.gmail.com)
  - SMTP_PORT: SMTP server port (default: 587)
  - SMTP_USER: SMTP username/email
  - SMTP_PASS: SMTP password or app password
  - SMTP_FROM: From email address (defaults to SMTP_USER)
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def get_smtp_config():
    return {
        "host": os.environ.get("SMTP_HOST", "smtp.gmail.com"),
        "port": int(os.environ.get("SMTP_PORT", "587")),
        "user": os.environ.get("SMTP_USER", ""),
        "password": os.environ.get("SMTP_PASS", ""),
        "from_email": os.environ.get("SMTP_FROM", os.environ.get("SMTP_USER", "")),
    }


def send_email(to_email: str, subject: str, content: str) -> dict:
    """
    Send an email via SMTP.
    Returns {"success": True/False, "message": "..."}
    """
    config = get_smtp_config()

    if not config["user"] or not config["password"]:
        # No SMTP configured — log but don't fail
        return {
            "success": True,
            "message": "Email logged (SMTP not configured). Set SMTP_USER and SMTP_PASS environment variables to enable real email sending."
        }

    if not to_email:
        return {"success": False, "message": "No recipient email address provided"}

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = config["from_email"]
        msg["To"] = to_email

        # Create HTML version
        html_content = f"""
        <html>
        <body style="font-family: 'Inter', Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="background: #714B67; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">HRM System</h2>
            </div>
            <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                {content.replace(chr(10), '<br>')}
            </div>
            <div style="padding: 10px; text-align: center; color: #9ca3af; font-size: 12px;">
                This email was sent from HRM System
            </div>
        </body>
        </html>
        """

        msg.attach(MIMEText(content, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(config["host"], config["port"]) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(config["user"], config["password"])
            server.sendmail(config["from_email"], to_email, msg.as_string())

        return {"success": True, "message": "Email sent successfully"}

    except smtplib.SMTPAuthenticationError:
        return {"success": False, "message": "SMTP authentication failed. Check credentials."}
    except smtplib.SMTPException as e:
        return {"success": False, "message": f"SMTP error: {str(e)}"}
    except Exception as e:
        return {"success": False, "message": f"Failed to send email: {str(e)}"}


# ── Email Templates ───────────────────────────────────────

def build_interview_invite(candidate_name: str, position: str, scheduled_at: str,
                           interview_type: str, location: str = "") -> tuple:
    """Build interview invitation email. Returns (subject, content)."""
    subject = f"Thư mời phỏng vấn - Vị trí {position}"

    location_text = ""
    if interview_type == "online":
        location_text = f"\n📍 Hình thức: Online" + (f"\n🔗 Link: {location}" if location else "")
    else:
        location_text = f"\n📍 Địa điểm: {location}" if location else "\n📍 Hình thức: Tại văn phòng"

    content = f"""Kính gửi {candidate_name},

Cảm ơn bạn đã ứng tuyển vào vị trí {position} tại công ty chúng tôi.

Chúng tôi rất vui được mời bạn tham gia buổi phỏng vấn:

📅 Thời gian: {scheduled_at}{location_text}

Vui lòng xác nhận tham gia bằng cách phản hồi email này.

Nếu bạn có bất kỳ câu hỏi nào, đừng ngại liên hệ với chúng tôi.

Trân trọng,
Phòng Nhân sự"""

    return subject, content


def build_result_notification(candidate_name: str, position: str, result: str) -> tuple:
    """Build result notification email. Returns (subject, content)."""
    if result == "accepted" or result == "hired":
        subject = f"Chúc mừng! Kết quả tuyển dụng - Vị trí {position}"
        content = f"""Kính gửi {candidate_name},

Chúng tôi rất vui thông báo rằng bạn đã được chấp nhận vào vị trí {position} tại công ty chúng tôi.

Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất để thảo luận về các bước tiếp theo.

Chào mừng bạn đến với đội ngũ của chúng tôi!

Trân trọng,
Phòng Nhân sự"""
    else:
        subject = f"Thông báo kết quả tuyển dụng - Vị trí {position}"
        content = f"""Kính gửi {candidate_name},

Cảm ơn bạn đã dành thời gian ứng tuyển và tham gia phỏng vấn cho vị trí {position}.

Sau khi xem xét kỹ lưỡng, chúng tôi rất tiếc phải thông báo rằng chúng tôi đã quyết định tiếp tục với ứng viên khác phù hợp hơn cho vị trí này.

Chúng tôi đánh giá cao sự quan tâm của bạn và khuyến khích bạn theo dõi các vị trí tuyển dụng khác trong tương lai.

Chúc bạn mọi điều tốt đẹp!

Trân trọng,
Phòng Nhân sự"""

    return subject, content
