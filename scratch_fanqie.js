async function getClasses() {
  const r = await fetch('https://fanqienovel.com/reader/7147597903551431201');
  const html = await r.text();
  const matches = html.match(/class="([^"]*reader[^"]*)"/g);
  console.log(matches);
  console.log("muye-reader-content exists:", html.includes('muye-reader-content'));
}
getClasses();
