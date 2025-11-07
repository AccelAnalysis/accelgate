// Minimal API helper that uses x-www-form-urlencoded to avoid CORS preflight with Apps Script.
window.Api = (function(){
  function post(action, data={}){
    const params = new URLSearchParams({ action, ...data });
    return fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: params.toString()
    }).then(r => r.json());
  }
  function get(params={}){
    const qs = new URLSearchParams(params).toString();
    const url = qs ? `${SCRIPT_URL}?${qs}` : SCRIPT_URL;
    return fetch(url, { method: 'GET' }).then(r => r.json());
  }
  return {
    createPost:  (data)=>post('createPost', data),
    listPosts:   (filters)=>get({ ...filters, mode: 'listPosts' }),
    listPostsByOwner: (data)=>post('listPostsByOwner', data),
    savePin: (data)=>post('savePin', data),
    listPinsByOwner: (data)=>post('listPinsByOwner', data),
    createResponse: (data)=>post('createResponse', data),
    listResponses: (data)=>post('listResponses', data),
    evaluateResponse: (data)=>post('evaluateResponse', data),
    ping: () => get({ ping: '1' })
  };
})();
