function processMessage(message) {
    var type = message.type;
    switch (type) {
        case 'host-list':
            {
                var list = message.list;
                for (const address in list) {
                    console.log(address)
                    var obj = list[address];
                    var html = `<li id="${obj.hostname}" class="nav-item active"><a class="nav-link" href="#"><i class="fa fa-desktop"></i>`
                        + `<span> ${obj.hostname}</span><br>`
                        + `<i class="on-state fa fa-circle ${obj.live == true ? "online" : "offline"}"></i><span> ${address}</span></a></li><hr class="sidebar-divider my-0">`;
                    $('.after-user').before(html);

                }
            }
            break;
        case 'host-update':
            {
                if ($('#' + message.hostname).length) {
                    if (message.state)
                        $(`#${message.hostname} .on-state`).addClass('online').removeClass('offline');
                    else
                        $(`#${message.hostname} .on-state`).removeClass('online').addClass('offline');
                }
                else {
                    var html = `<li id="${message.hostname}" class="nav-item active"><a class="nav-link" href="#"><i class="fa fa-desktop"></i>`
                        + `<span> ${message.hostname}</span><br>`
                        + `<i class="on-state fa fa-circle ${message.state == true ? "online" : "offline"}"></i><span> ${message.address}</span></a></li><hr class="sidebar-divider my-0">`;
                    $('.after-user').before(html);
                }
                if (message.state)
                    $('.message-log').append(`<li>host ${message.address} connected at ${new Date().toLocaleString()}</li>`);
                else
                    $('.message-log').append(`<li>host ${message.address} disconnected at ${new Date().toLocaleString()}</li>`);
                    
                }
                break;
                case 'message':
                    {
                        $('.message-log').append(`<li>receive message from host ${message.address} at ${new Date().toLocaleString()}<br>
                                                  <u>->${message.content}</u></li>`);
                    }   
            break; 
        default:
            break;
    }
}
function validateIp(ip){
    nums = ip.split(".");
    if (nums.length!=4)return false;
    for (const i in nums){
         if(nums[i]<0 || nums[i]>255)
          return false;
    }
    return true;
}
$(document).ready(function () {
    const email = location.search.split('?email=')[1];
    $('.user-name').text(email);
    sendMessage({ type: 'get-hosts' });
    $('#command').keydown(function (e) {
        $("#showModal").modal();
        return;
        if (e.key == 'Enter') {
            ///// process command 
            var str = this.value;
            var type = str.split(' ')[0];
            switch (type) {
                case 'send':
                    {
                        str = str.slice(5).trim();
                        var ip = str.split(' ')[0];
                        var content = str.slice(ip.length).trim();
                        if(!validateIp(ip) || !content){
                             $("#showModal").modal();
                             return;
                        }
                        var message = {type:'message',content:content}
                        sendMessage({type:'peer-send',address:ip,message:message});
                        this.value = '';
                        $('.message-log').append(`<li> send message to host ${ip} at ${new Date().toLocaleString()}
                                                  <br><u><-${content}</u></li>`);
                        
                    }
                    break;

                default:
                    break;
            }
        }
    });
})
