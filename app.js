'use strict';
let snapshot, selected = 0;
const $ = id => document.getElementById(id);
const formatter = new Intl.NumberFormat();
const number = value => formatter.format(value);
const labels = {words:'words',lines:'lines',letters:'letters',smileys:'smileys',minutes:'time in channel'};
const channelHref = name => '#' + encodeURIComponent(name.slice(1));
const chartValue = (value,metric) => metric === 'minutes' ? (value/60).toFixed(1)+' hr' : number(value);
function renderCharts(channel,metric,ranked) {
  const top = ranked.slice(0,7), maximum = top.length ? top[0][metric] : 0;
  $('bar-caption').textContent = 'Ranked by '+labels[metric];
  $('bar-chart').setAttribute('aria-label','Top contributors in '+channel.name+' ranked by '+labels[metric]);
  $('bar-chart').replaceChildren(...top.map((user,index) => {
    const row = document.createElement('div'); row.className = 'bar-row';
    const rank = document.createElement('span'); rank.className = 'bar-rank'; rank.textContent = String(index+1).padStart(2,'0');
    const nick = document.createElement('span'); nick.className = 'bar-nick'; nick.textContent = user.nick;
    const track = document.createElement('span'); track.className = 'bar-track';
    const fill = document.createElement('span'); fill.className = 'bar-fill';
    fill.style.width = (maximum ? user[metric]/maximum*100 : 0)+'%'; track.append(fill);
    const value = document.createElement('strong'); value.className = 'bar-value'; value.textContent = chartValue(user[metric],metric);
    row.append(rank,nick,track,value); return row;
  }));
  if (!top.length) {
    const empty = document.createElement('p'); empty.className = 'chart-empty'; empty.textContent = 'Not enough activity to chart yet.';
    $('bar-chart').replaceChildren(empty);
  }

  const colors = ['#8be2c1','#75a9f9','#c494f4','#344156'];
  const leaders = [...channel.users].sort((a,b) => b.words-a.words || a.nick.localeCompare(b.nick)).slice(0,3);
  const total = channel.totals.words || 0, leading = leaders.reduce((sum,user) => sum+user.words,0);
  const segments = leaders.map(user => ({label:user.nick,value:user.words}));
  if (total-leading > 0) segments.push({label:'Everyone else',value:total-leading});
  let cursor = 0;
  const stops = segments.map((segment,index) => {
    const start = cursor; cursor += total ? segment.value/total*360 : 0;
    return `${colors[index]} ${start}deg ${cursor}deg`;
  });
  $('share-donut').style.background = total ? `conic-gradient(${stops.join(',')})` : '#273246';
  const percent = total ? Math.round(leading/total*100) : 0;
  $('share-percent').textContent = percent+'%';
  $('share-summary').textContent = `The top three contributors account for ${percent}% of words in ${channel.name}.`;
  $('share-legend').replaceChildren(...segments.map((segment,index) => {
    const item = document.createElement('div'); item.className = 'legend-item';
    const dot = document.createElement('span'); dot.className = 'legend-dot'; dot.style.background = colors[index];
    const label = document.createElement('span'); label.textContent = segment.label;
    const share = document.createElement('strong'); share.textContent = (total ? Math.round(segment.value/total*100) : 0)+'%';
    item.append(dot,label,share); return item;
  }));
}
function selectFromUrl() {
  if (!snapshot || !snapshot.channels.length) return;
  let slug;
  try { slug = decodeURIComponent(location.hash.slice(1)); } catch { slug = ''; }
  const index = snapshot.channels.findIndex(c => c.name.toLowerCase() === ('#' + slug).toLowerCase());
  selected = index < 0 ? 0 : index;
  if (index < 0) history.replaceState(null, '', channelHref(snapshot.channels[selected].name));
  render();
}
function render() {
  const channel = snapshot.channels[selected];
  if (!channel) return;
  document.title = channel.name + ' · Informix statistics';
  $('channel-title').textContent = channel.name;
  $('channel-topic').textContent = channel.topic || '';
  $('channel-topic').hidden = !channel.topic;
  $('channels').querySelectorAll('a').forEach((link,index) => {
    if (selected === index) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  $('summary').replaceChildren(...[
    ['Contributors',channel.users.length,'People in the leaderboard'],
    ['Words spoken',channel.totals.words,'Words counted'],
    ['Chat lines',channel.totals.lines,'Messages counted'],
    ['Smileys',channel.totals.smileys,'A little personality']
  ].map(([title,total,description]) => {
    const card = document.createElement('div'); card.className = 'metric';
    const label = document.createElement('span'); label.textContent = title;
    const value = document.createElement('strong'); value.textContent = number(total);
    const note = document.createElement('small'); note.textContent = description;
    card.append(label,value,note); return card;
  }));
  const sort = $('sort').value, search = $('search').value.trim().toLowerCase();
  const ranked = [...channel.users].sort((a,b) => b[sort]-a[sort] || a.nick.localeCompare(b.nick));
  renderCharts(channel,sort,ranked);
  const maximum = ranked.length ? ranked[0][sort] : 0, rows = [];
  ranked.forEach((user,index) => {
    if (!user.nick.toLowerCase().includes(search)) return;
    const tr = document.createElement('tr');
    if (index < 3) tr.className = 'podium podium-' + (index+1);
    [index+1,user.nick,number(user.words),number(user.lines),number(user.letters),number(user.smileys),(user.minutes/60).toFixed(1)].forEach((value,column) => {
      const td = document.createElement('td');
      if (column === 1) {
        const name = document.createElement('span'); name.className = 'nickname'; name.textContent = String(value);
        const track = document.createElement('span'); track.className = 'activity'; track.setAttribute('aria-hidden','true');
        const bar = document.createElement('span'); bar.style.width = (maximum ? user[sort]/maximum*100 : 0)+'%';
        track.append(bar); td.append(name,track);
      } else td.textContent = String(value);
      tr.append(td);
    }); rows.push(tr);
  });
  $('rows').replaceChildren(...rows); $('empty').hidden = rows.length !== 0;
  $('results').textContent = (search ? number(rows.length)+' of ' : '') + number(channel.users.length)+' contributors · ranked by '+labels[sort];
  document.querySelectorAll('th[data-sort]').forEach(th => {
    if (th.dataset.sort === sort) th.setAttribute('aria-sort','descending');
    else th.removeAttribute('aria-sort');
  });
  $('share-status').textContent = '';
}
function updateTimestamp() {
  if (!snapshot) return;
  const date = new Date(snapshot.updated);
  const minutes = Math.max(0,Math.floor((Date.now()-date.getTime())/60000));
  const relative = minutes < 1 ? 'just now' : minutes < 60 ? minutes+' min ago' : Math.floor(minutes/60)+' hr ago';
  $('updated').textContent = 'Updated '+relative;
  $('updated').dateTime = date.toISOString(); $('updated').title = date.toLocaleString();
}
$('search').addEventListener('input',() => { if (snapshot) render(); });
$('sort').addEventListener('change',() => { if (snapshot) render(); });
window.addEventListener('hashchange',selectFromUrl);
$('share').addEventListener('click',async () => {
  try { await navigator.clipboard.writeText(location.href); $('share-status').textContent = 'Channel link copied'; }
  catch { $('share-status').textContent = 'Copy the URL from your address bar to share this channel.'; }
});
fetch('data.json',{cache:'no-cache'}).then(response => {
  if (!response.ok) throw new Error('Snapshot unavailable'); return response.json();
}).then(data => {
  snapshot = data;
  if (!data.channels.length) {
    $('channel-title').textContent = 'Channel statistics'; $('updated').textContent = 'No public channels are configured.';
    $('content').hidden = true; return;
  }
  $('channels').replaceChildren(...data.channels.map(channel => {
    const link = document.createElement('a'); link.textContent = channel.name; link.href = channelHref(channel.name); return link;
  }));
  updateTimestamp(); selectFromUrl(); $('share').disabled = false;
  setInterval(updateTimestamp,60000);
}).catch(() => {
  $('channel-title').textContent = 'Channel statistics';
  $('updated').textContent = 'The snapshot is unavailable. Please try again later.';
  $('content').hidden = true;
});
