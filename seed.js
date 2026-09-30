require('dotenv').config();
const crypto=require('crypto'),bcrypt=require('bcryptjs'),{createClient}=require('@supabase/supabase-js');
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
function result(value,label){if(value.error)throw new Error(`${label}: ${value.error.message}`);return value.data}
(async()=>{
 const divisions=[
  ['Badan Pengurus Harian (BPH)','Pimpinan inti yang mengoordinasikan seluruh organisasi'],
  ['Badan Penelitian & Pengembangan (Litbang)','Pusat pengkajian dan pengembangan sistem organisasi'],
  ['Unit Kantor Media Informasi (KMI)','Pusat pengelolaan informasi dan media organisasi'],
  ['Bidang PSDM','Pembinaan dan pengembangan sumber daya mahasiswa'],
  ['Bidang Riset & Keilmuan (Riskel)','Pengembangan ekosistem riset dan keilmiahan'],
  ['Bidang Kesejahteraan Mahasiswa (Kesma)','Pelayanan, advokasi, dan kesejahteraan mahasiswa'],
  ['Bidang Hubungan Masyarakat (Humas)','Pengelolaan relasi eksternal dan citra organisasi'],
  ['Bidang Pengabdian Masyarakat (Dimas)','Kegiatan sosial dan pengabdian kepada masyarakat'],
  ['Bidang Minat, Bakat & Kegemaran (Mikatan)','Wadah pengembangan minat, bakat, dan UKM'],
  ['Bidang Ekonomi & Bisnis (Ekobis)','Pengembangan kewirausahaan dan ekonomi organisasi']
 ];
 const divisionPasswordHash=await bcrypt.hash('kmi123',12);
 for(const [name] of divisions)result(await db.from('divisions').upsert({name,description:null,password_hash:divisionPasswordHash,password_enabled:false},{onConflict:'name'}),`Membuat bidang ${name}`);
 result(await db.from('requests').update({division:'Bidang PSDM'}).eq('division','PSDM'),'Memperbarui bidang request PSDM');
 result(await db.from('requests').update({division:'Bidang Hubungan Masyarakat (Humas)'}).eq('division','Humas'),'Memperbarui bidang request Humas');
 result(await db.from('profiles').update({division:'Unit Kantor Media Informasi (KMI)'}).eq('division','Media'),'Memperbarui bidang profil Media');
 result(await db.from('divisions').delete().in('name',['Acara','PSDM','Humas','Kastrad','Keuangan','Media','Sekretariat']),'Menghapus bidang lama');
 const rows=result(await db.from('divisions').select('name'),'Membaca bidang');if((rows||[]).length<divisions.length)throw Error('Schema belum dijalankan di Supabase SQL Editor');
 const users=[['Admin KMI','admin@kmi.id','super_admin','Unit Kantor Media Informasi (KMI)']];
 for(const [name,email,role,division] of users){const created=await db.auth.admin.createUser({email,password:'admin123',email_confirm:true});let id=created.data?.user?.id;if(created.error?.message?.includes('already been registered')){const list=result(await db.auth.admin.listUsers(),'Membaca user Auth');id=list.users.find(x=>x.email===email)?.id;if(id)result(await db.auth.admin.updateUserById(id,{password:'admin123',email_confirm:true}),'Memperbarui password admin')}else if(created.error)throw Error(`Membuat user ${email}: ${created.error.message}`);result(await db.from('profiles').upsert({id,name,email,role,division},{onConflict:'id'}),`Membuat profil ${email}`)}
 const profiles=result(await db.from('profiles').select('id,email'),'Membaca profil'),ids=Object.fromEntries((profiles||[]).map(x=>[x.email,x.id]));
 const existing=result(await db.from('requests').select('id').eq('title','Open Recruitment Staff 2026').maybeSingle(),'Mengecek request demo');
 if(!existing){const request=result(await db.from('requests').insert({public_token:crypto.randomBytes(24).toString('hex'),requester_name:'Demo User',division:'PSDM',title:'Open Recruitment Staff 2026',draft_url:'https://drive.google.com/example',slide_count:5,post_type:'Feed',deadline:'2026-10-05T23:59:00+07:00',status:'Diproses',assigned_to:'Admin KMI'}).select().single(),'Membuat request demo');result(await db.from('activity_logs').insert({request_id:request.id,actor_id:ids['admin@kmi.id'],action:'Request dibuat',new_value:'Menunggu'}),'Membuat log demo')}
 console.log('Seed Supabase selesai. Login admin: admin / admin123. Password bidang nonaktif secara default; password awal tersimpan: kmi123');
})().catch(error=>{console.error(error);process.exitCode=1});
