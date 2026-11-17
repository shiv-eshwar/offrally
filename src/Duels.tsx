import {useEffect,useRef,useState} from 'react';
import {Capacitor} from '@capacitor/core';import {App as NativeApp} from '@capacitor/app';
import {Check,Copy,Flag,Plus,Swords,Trophy,Users,ArrowRight} from 'lucide-react';
import {displayTime} from './domain.mjs';import {request,type Room,type Action} from './competition';
export default function Duels(){
 const [room,setRoom]=useState<Room|null>(null),[code,setCode]=useState(()=>localStorage.getItem('club.room')||''),[name,setName]=useState(()=>localStorage.getItem('club.name')||''),[invite,setInvite]=useState(''),[mode,setMode]=useState('create'),[minutes,setMinutes]=useState(5),[error,setError]=useState(''),[busy,setBusy]=useState(false),[copied,setCopied]=useState(false);
 const stage=useRef<Room['stage']>('waiting');
 useEffect(()=>{
   if(!code)return;let alive=true,pending=false,foreground=true;let timer:ReturnType<typeof setTimeout>|undefined;
   async function poll(){
     if(!alive||document.hidden||!foreground||pending)return;pending=true;
     try{const r=await request(stage.current==='running'?'beat':'look',code);if(alive){stage.current=r.stage;setRoom(r);setError('')}}
     catch(e){if(alive)setError(e instanceof Error?e.message:'Could not reach your room.')}
     finally{pending=false;if(alive&&!document.hidden&&foreground&&!['expired','finished'].includes(stage.current)){clearTimeout(timer);timer=setTimeout(poll,3000)}}
   }
   function pause(){clearTimeout(timer);if(stage.current==='running')void request('rest',code).catch(()=>{})}
   function visible(){if(document.hidden)pause();else {clearTimeout(timer);void poll()}}
   const listener=Capacitor.isNativePlatform()?NativeApp.addListener('appStateChange',s=>{foreground=s.isActive;if(foreground)visible();else pause()}):null;
   document.addEventListener('visibilitychange',visible);void poll();
   return()=>{alive=false;clearTimeout(timer);pause();document.removeEventListener('visibilitychange',visible);void listener?.then(x=>x.remove())}
 },[code]);
 async function enter(){
   setBusy(true);setError('');
   try{const r=await request(mode as Action,mode==='join'?invite.trim().toUpperCase():'',name.trim(),minutes);localStorage.setItem('club.name',name.trim());localStorage.setItem('club.room',r.code);stage.current=r.stage;setRoom(r);setCode(r.code)}
   catch(e){setError(e instanceof Error?e.message:'Connection failed.')}finally{setBusy(false)}
 }
 function leave(){localStorage.removeItem('club.room');setCode('');setRoom(null);setError('');setCopied(false)}
 async function copy(){try{await navigator.clipboard.writeText(code);setCopied(true)}catch{setError('Select and copy the room code above.')}}
 return <><div className="eyebrow"><Swords size={15}/> TWO-PLAYER CLUB</div><h1>Friend duels<span>.</span></h1><p className="lede">Same clock. Two friends. Most focus time wins.</p>
 {!code?<><div className="versus"><div><Flag size={16}/> MATCH DAY</div><b>01 <em>vs</em> 01</b><Swords className="big-swords"/></div><div className="seg"><button aria-pressed={mode==='create'} onClick={()=>setMode('create')}><Plus/>New room</button><button aria-pressed={mode==='join'} onClick={()=>setMode('join')}><Users/>Join room</button></div><form className="panel form" onSubmit={e=>{e.preventDefault();void enter()}}><label>Your nickname<input required maxLength={20} value={name} onChange={e=>setName(e.target.value)} placeholder="Pick a player name"/></label>{mode==='join'?<label>Invite code<input required minLength={10} maxLength={10} autoCapitalize="characters" value={invite} onChange={e=>setInvite(e.target.value.toUpperCase())} placeholder="10-character code"/></label>:<><label>Round length</label><div className="presets">{[1,5,15,25].map(m=><button type="button" key={m} aria-pressed={m===minutes} onClick={()=>setMinutes(m)}>{m} min</button>)}</div></>}<button disabled={busy||!name.trim()||(mode==='join'&&invite.trim().length!==10)} className="primary">{busy?'Connecting…':mode==='create'?'Create a duel':'Join duel'} <ArrowRight/></button></form><p className="footnote">The round starts when player two joins. Keep the duel screen visible to earn seconds. Both players need internet.</p></>:
 !room?<div className="panel"><p>Opening room {code}…</p><button className="back" onClick={leave}>Back to lobby</button></div>:
 <><div className="panel scoreboard"><span className="ticker">{room.stage==='waiting'?'INVITE A FRIEND':room.stage.toUpperCase()}</span><h2>{room.stage==='waiting'?'Waiting for player two':room.stage==='expired'?'Invite expired':room.stage==='finished'?(room.hostMs===room.guestMs?'It’s a tie!':(room.hostMs>room.guestMs?room.host:room.guest)+' wins!'):displayTime(room.remainingMs)+' left'}</h2>{room.stage==='waiting'&&<button className="code" onClick={copy} aria-label={'Copy invite code '+code}>{code}{copied?<Check/>:<Copy/>}</button>}{[[room.host,room.hostMs,'host'],[room.guest||'Open seat',room.guestMs,'guest']].map(([label,ms,seat])=><div className="player" key={String(seat)}><span><i/>{label}{seat===room.seat?' (you)':''}</span><strong>{displayTime(Number(ms))}</strong></div>)}</div><p className="footnote">{room.stage==='waiting'?'Share the code with one friend. Invites expire after 24 hours.':room.stage==='running'?'Scoring while this screen is open. Scores refresh every three seconds.':'Round closed. Ready for a rematch?'}</p>{room.stage==='running'?<p className="footnote">Switch tabs to pause earning time.</p>:<button className="secondary full" onClick={leave}>{room.stage==='waiting'?'Back to lobby':'Return to lobby'}</button>}</>}
 {error&&<p className="notice" role="alert">{error}</p>}</>
}
