$(document).ready(function () {
  $(".col").hide();
  $(".col").each(function (index, value) {
    if (index < 15) {
      $(this).show();
    }
  });
  if ($(".col:hidden").length) {
    $("#more").show();
  }
  if (!$(".col:hidden").length) {
    $("#more").hide();
  }
});

$("#more").on("click", function () {
  $(".col:hidden").each(function (index, value) {
    if (index < 15) {
      $(this).show();
    }
  });
  if (!$(".col:hidden").length) {
    $("#more").hide();
  }
});

var fleg = 0
document.querySelector("#showmore").addEventListener("click",function(){
    if(fleg===0){
        document.querySelector("#showmore h4").style.fontWeight = "700"
        document.querySelector("#options").style.display = 'flex'
        fleg = 1
    }else{
        document.querySelector("#showmore h4").style.fontWeight = "400"
        document.querySelector("#options").style.display = 'none'
        fleg = 0
    }

})

var flag = 0
document.querySelector("#search-click").addEventListener("click",function(){
    if(flag===0){
        document.querySelector("#search-click h4").style.fontWeight = "700"
        document.querySelector("#searching").style.left = '20vw'
        flag = 1
    }else{
        document.querySelector("#search-click h4").style.fontWeight = "400"
        document.querySelector("#searching").style.left = '-100vw'
        flag = 0
    }

})

function sendData(e){
    const searchResults = document.querySelector("#searchResults")
    let match = e.value.match(/^[a-zA-Z]*/)
    let match2 = e.value.match(/\s*/)
    if(match2[0] === e.value){
        searchResults.innerHTML = '';
        return
    }
    if(match[0]=== e.value){
        fetch('getusers',{
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({payload: e.value}),
        }).then(res => res.json()).then(data => {
            let payload = data.payload
            searchResults.innerHTML = ''
            if(payload.length < 1){
                searchResults.innerHTML = '<p> No result found </p>'
                return
            }
            payload.forEach((item,index)=>{
                if(index>0) searchResults.innerHTML += '<hr>'
                searchResults.innerHTML += `<a href="/profile/${item.username}"> 
                    <div id="searchphoto"> <img src="/image/${item.profileImage}" alt=""></div> 
                    <div id="resultbox"> <h3> ${item.username} </h3> <small>${item.name}</small></div> 
                </a>`
            })
    })
    return
    }
}
