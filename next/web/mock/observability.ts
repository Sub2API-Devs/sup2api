import { fail, now, on, paginate } from './router'

const boot = ['b7f1c2d4-8e9a-4b0c-a1d2-3e4f5a6b7c8d','c0ffee00-1234-4abc-9def-0123456789ab','dead0000-0000-4000-8000-000000000003']
const created = now(-100)
const steps = ['node-1','node-2','node-3'].flatMap((node_id,i) => ['stop','prepare','start','local'].map((action,j) => ({ step_id: i*4+j, node_id, action, status: i < 2 ? 'done' : j === 0 ? 'running' : 'pending' })))
const plan = { id: 'demo-upgrade', release_digest: 'release-new', status: 'running', cursor: 8, nodes: ['node-1','node-2','node-3'], created_at: created, steps }
on('GET','/system/releases', () => ({ releases: ['old','new'].map((v,i) => ({ digest: `release-${v}`, manifest: { release_id: `0.1.${6+i}`, build_id: v, source_commit: 'demo', created_at: created } })) }))
on('GET','/system/upgrades', () => ({ upgrades: [plan], primary_node: 'node-1', revision: 3, nodes: boot.map((core_boot_id,i) => ({ node_id: `node-${i+1}`, release_digest: 'release-new', core_boot_id, shell_boot_id: `shell-boot-${i}`, route_revision: 3, cpu_percent: [87,21,18][i], offloading: i===0, mode: i===2 ? 'forward' : 'local', ready: true, enabled: true, stopped: false, last_seen: now(-2) })) }))
on('GET','/system/upgrades/:id',()=>plan)
on('GET','/system/upgrades/:id/events',()=>({ events: steps.filter(s=>s.status==='done').flatMap((s,i)=>[{id:i*2+1, kind:'step', message:`${s.node_id}: ${s.action}`,created_at:now(-90+i*8)},{id:i*2+2,kind:'done',message:`${s.node_id}: ${s.action} `,created_at:now(-87+i*8)}]) }))
on('GET','/system/offload',()=>({enabled:true,cpu_threshold_percent:80}))
on('GET','/audit-logs',req=>paginate([{id:1, user_id:null, action:'plugin.upgrade',target_type:'plugin',target_id:'anthropic', detail:{source:'builtin',version:'0.2.1'},ip:'',created_at:now(-20)}].filter(r=>!req.query.action||req.query.action===r.action),req.query))

// Registered before plugins/:key so the literal /plugins/rollouts wins.
const history = [{ id: 52, plugin_key:'anthropic',action:'upgrade',from_version:'0.2.0',target_version:'0.2.1',phase:'active',coordinator:'node-1',error:'',created_at:now(-30),updated_at:now(-10),nodes:boot.map((boot_id,i)=>({node_id:`node-${i+1}`,boot_id,state:i===2?'failed':'active',error:i===2?'health check failed':''})) }]
on('GET','/plugins/rollouts',req=>{
  if (req.query.since && Number.isNaN(Date.parse(req.query.since))) return fail(400,'invalid_argument','invalid since')
  return paginate(history.filter(r=>!req.query.since||r.created_at>=req.query.since),req.query)
})
on('GET','/plugins/:key/rollouts',req=>paginate(history.filter(r=>r.plugin_key===req.params.key),req.query))
on('GET','/plugins/:key/history',req=>paginate(history.filter(r=>r.plugin_key===req.params.key&&(!req.query.rollout_id||String(r.id)===req.query.rollout_id)).flatMap(r=>[
  ...['created','activating','active'].map((state,i)=>({id:100+i,plugin_key:r.plugin_key,rollout_id:r.id,node_id:'',boot_id:'',state,version:r.target_version,message:JSON.stringify({action:'upgrade'}),created_at:now(-30+i*8)})),
  ...r.nodes.map((n,i)=>({id:103+i,plugin_key:r.plugin_key,rollout_id:r.id,node_id:n.node_id,boot_id:n.boot_id,state:n.state,version:n.state==='failed'?r.from_version:r.target_version,message:JSON.stringify({fallback:n.state==='failed'?r.from_version:'',error:n.error}),created_at:now(-10)}))
]).sort((a,b)=>b.id-a.id),req.query))
