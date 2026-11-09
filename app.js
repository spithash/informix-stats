'use strict';
let snapshot, selected = 0;
const $ = id => document.getElementById(id);
const number = value => new Intl.NumberFormat().format(value);
function render() {
  const channel = snapshot.channels[selected];
  if (!channel) { $('updated').textContent = 'No public channels are configured.'; return; }
  $('channels').replaceChildren(...snapshot.channels.map((item, index) => {
    const button = document.createElement('button'); button.textContent = item.name;
    button.setAttribute('aria-pressed', String(selected === index));
    button.onclick = () => { selected = index; render(); }; return button;
  }));
  $('heading').textContent = channel.name + ' leaderboard';
  $('summary').replaceChildren(...[['People',channel.users.length],['Words',channel.totals.words],['Lines',channel.totals.lines],['Smileys',channel.totals.smileys]].map(([title,total]) => {
    const card = document.createElement('div'); card.className = 'metric';
    const label = document.createElement('span'); label.textContent = title;
    const value = document.createElement('strong'); value.textContent = number(total);
    card.append(label,value); return card;
  }));
  const sort = $('sort').value, search = $('search').value.toLowerCase();
  const ranked = [...channel.users].sort((a,b) => b[sort]-a[sort] || a.nick.localeCompare(b.nick));
  const rows = [];
  ranked.forEach((user,index) => {
    if (!user.nick.toLowerCase().includes(search)) return;
    const tr = document.createElement('tr');
    [index+1,user.nick,number(user.words),number(user.lines),number(user.letters),number(user.smileys),(user.minutes/60).toFixed(1)].forEach(value => {
      const td = document.createElement('td'); td.textContent = String(value); tr.append(td);
    }); rows.push(tr);
  });
  $('rows').replaceChildren(...rows); $('empty').hidden = rows.length !== 0;
}
$('search').addEventListener('input', render); $('sort').addEventListener('change', render);
fetch('data.json', {cache:'no-cache'}).then(response => {
  if (!response.ok) throw new Error('Snapshot unavailable'); return response.json();
}).then(data => {
  snapshot = data;
  $('updated').textContent = 'Last snapshot: ' + new Date(data.updated).toLocaleString() + ' · Collected by ' + data.module;
  render();
}).catch(() => { $('updated').textContent = 'The statistics snapshot is unavailable. Please try again later.'; });
