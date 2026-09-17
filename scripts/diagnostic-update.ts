// Served outside the cached app shell so an older installed build can apply a waiting update.
export const updatePage = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Update Fieldbook</title>
<style>body{font:18px system-ui;max-width:36rem;margin:2rem auto;padding:1rem;background:#f5f3e9;color:#203d30}button{font:inherit;padding:1rem}p{overflow-wrap:anywhere}</style>
<h1>Update Fieldbook</h1><p>Finish any identification or save in your other Fieldbook windows first. This updates the app code and keeps saved sightings, queued photos and downloaded recognition files.</p>
<p id="address"></p><button id="update">Update and open Fieldbook</button><p id="status" role="status"></p>
<script>
document.getElementById('address').textContent=location.origin;
const button=document.getElementById('update'),status=document.getElementById('status');
button.onclick=async()=>{
  button.disabled=true;status.textContent='Checking for the latest app…';
  try {
    if(!('serviceWorker' in navigator))throw Error('Service workers are unavailable. Check that this address is trusted HTTPS.');
    const registration=await navigator.serviceWorker.getRegistration('/');
    if(!registration){location.replace('/');return;}
    await registration.update();
    const worker=registration.installing||registration.waiting;
    if(worker){
      status.textContent='Applying the update…';
      await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{cleanup();reject(Error('The update is taking longer than expected. Keep home Wi-Fi connected and try again.'));},60000);
        function cleanup(){clearTimeout(timer);worker.removeEventListener('statechange',changed);}
        function changed(){
          if(worker.state==='installed')worker.postMessage({type:'SKIP_WAITING'});
          if(worker.state==='activated'){cleanup();resolve();}
          if(worker.state==='redundant'){cleanup();reject(Error('The update could not be installed. Try again.'));}
        }
        worker.addEventListener('statechange',changed);changed();
      });
    }
    location.replace('/');
  }catch(error){status.textContent=String(error);button.disabled=false;}
};
</script></html>`;
