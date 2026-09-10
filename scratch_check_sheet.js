async function checkSheetInfo() {
  const spreadsheetId = '1Z6i0o0DIETLHKrm5SxviwpO5_de6ZoouJlddKiwauJo';
  const urls = [
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`,
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`,
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=tsv&gid=0`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      const text = await res.text();
      console.log(`URL [${url}] => Status: ${res.status}, Length: ${text.length}`);
      if (text.length < 500) {
        console.log('Response:\n', text);
      } else {
        console.log('Preview:\n', text.substring(0, 300));
      }
    } catch (e) {
      console.log(`URL [${url}] => Error: ${e.message}`);
    }
  }
}
checkSheetInfo();
