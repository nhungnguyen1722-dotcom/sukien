async function testWithSpreadsheetId() {
  const url = 'https://script.google.com/macros/s/AKfycbyXWBaCWRQKQRBrMpP2Yfe-8kTMRQTISqVLXkbI7d7n2Xi3--HMpeH5zxECl08lp2g-/exec';
  const spreadsheetId = '1Z6i0o0DIETLHKrm5SxviwpO5_de6ZoouJlddKiwauJo';

  const payload = {
    spreadsheetId: spreadsheetId,
    sheet_id: spreadsheetId,
    type: 'member',
    member_id: 1,
    full_name: 'Nhung Nguyễn',
    phone: '0000000001',
    email: 'nhungnguyen1722@gmail.com',
    role: 'Admin',
    title: 'Giám đốc',
    status: 'Đang hoạt động',
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
    const text = await res.text();
    console.log('Status:', res.status, 'Response:', text);
  } catch (e) {
    console.error('Error:', e);
  }
}
testWithSpreadsheetId();
