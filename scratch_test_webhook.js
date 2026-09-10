async function testWebhook() {
  const url = 'https://script.google.com/macros/s/AKfycbyXWBaCWRQKQRBrMpP2Yfe-8kTMRQTISqVLXkbI7d7n2Xi3--HMpeH5zxECl08lp2g-/exec';

  const testPayloads = [
    { name: 'member', data: { type: 'member', full_name: 'Test Member', phone: '0901234567' } },
    { name: 'event', data: { type: 'event', event_name: 'Test Event', event_date: '2026-09-10' } },
    { name: 'registration', data: { guest_name: 'Test Guest', guest_phone: '0901234567', attendance_status: 'Đã check-in' } },
    { name: 'invalid_json', raw: 'not json' }
  ];

  for (const t of testPayloads) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: t.raw ? t.raw : JSON.stringify(t.data),
        redirect: 'follow',
      });
      const text = await res.text();
      console.log('Payload [' + t.name + '] => Status: ' + res.status + ', Body: ' + text);
    } catch (e) {
      console.log('Payload [' + t.name + '] => Error: ' + e.message);
    }
  }
}
testWebhook();
