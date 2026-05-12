// Email template builder helpers (frontend-side)

export function buildInterviewInvite(candidateName, position, scheduledAt, interviewType, location) {
    const subject = `Thư mời phỏng vấn - Vị trí ${position}`;
    const locationText = interviewType === 'online'
        ? `Hình thức: Online${location ? `\nLink: ${location}` : ''}`
        : `Địa điểm: ${location || 'Tại văn phòng'}`;

    const content = `Kính gửi ${candidateName},

Cảm ơn bạn đã ứng tuyển vào vị trí ${position} tại công ty chúng tôi.

Chúng tôi mời bạn tham gia buổi phỏng vấn:

📅 Thời gian: ${scheduledAt}
📍 ${locationText}

Vui lòng xác nhận tham gia bằng cách phản hồi email này.

Trân trọng,
Phòng Nhân sự`;

    return { subject, content };
}

export function buildResultNotification(candidateName, position, result) {
    if (result === 'hired' || result === 'accepted') {
        return {
            subject: `Chúc mừng! Kết quả tuyển dụng - Vị trí ${position}`,
            content: `Kính gửi ${candidateName},

Chúng tôi rất vui thông báo rằng bạn đã được chấp nhận vào vị trí ${position}.

Chúng tôi sẽ liên hệ với bạn sớm nhất để thảo luận các bước tiếp theo.

Chào mừng bạn!

Trân trọng,
Phòng Nhân sự`,
        };
    }

    return {
        subject: `Thông báo kết quả tuyển dụng - Vị trí ${position}`,
        content: `Kính gửi ${candidateName},

Cảm ơn bạn đã ứng tuyển cho vị trí ${position}.

Sau khi xem xét, chúng tôi rất tiếc phải thông báo rằng chúng tôi đã chọn ứng viên phù hợp hơn cho vị trí này.

Khuyến khích bạn theo dõi các vị trí tuyển dụng khác trong tương lai.

Trân trọng,
Phòng Nhân sự`,
    };
}
