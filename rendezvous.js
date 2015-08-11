var dgram = require('dgram');

var udp_matchmaker = dgram.createSocket('udp4');
var udp_port = 6312;
udp_matchmaker.bind(udp_port);



udp_matchmaker.on('listening', function () {
    var address = udp_matchmaker.address();
    console.log('# listening [%s:%s]', address.address, address.port);
});


var clients = {};
/*
 Event: 'message'#
 msg Buffer object. The message
 rinfo Object. Remote address information
 Emitted when a new datagram is available on a socket. msg is a Buffer and rinfo is an object with the sender's address information:
 */
udp_matchmaker.on('message', function (data, rinfo)
{
    try
    {
        data = JSON.parse(data);
    } catch (e)
    {
        return console.log('! Couldn\'t parse data (%s):\n%s', e, data);
    }

    if (data.type == 'register')
    {
        clients[data.name] =
        {
            name: data.name,
            connections:
            {
                local: data.linfo,
                public: rinfo
            }
        };

        /*
         ‌‌JSON.stringify(clients) 或 JSON.stringify(clients, null, 4)
         ‌{"AA":{"name":"AA","connections":{"local":{"port":53807,"address":"127.0.0.1"},"public":{"address":"192.168.1.125","family":"IPv4","port":53807,"size":76}}}}
         */

        console.log('# Client registered: %s@[%s:%s | %s:%s]', data.name,
            rinfo.address, rinfo.port, data.linfo.address, data.linfo.port);

    }
    /*
        客户端发了一个这个：
        send(rendezvous, {type: 'connect', from: clientName, to: remoteName});
        clients是一个字典
     */
    else if (data.type == 'connect')
    {
        var couple = [clients[data.from], clients[data.to]]
        for (var i = 0; i < couple.length; i++)
        {
            if (!couple[i])
                return console.log('Client unknown!');
        }

        for (var i = 0; i < couple.length; i++)
        {
            send(couple[i].connections.public.address, couple[i].connections.public.port,
                {
                    type: 'connection',
                    client: couple[(i + 1) % couple.length],
                });
        }
    }

    console.log("收到Message,clients = ");
    console.log(JSON.stringify(clients, null, 4));

});



var send = function (host, port, msg, cb) {
    var data = new Buffer(JSON.stringify(msg));
    //      socket.send(buf, offset, length,      port, address[, callback])#
    udp_matchmaker.send(data, 0,     data.length, port, host, function (err, bytes)
    {
        if (err)
        {
            udp_matchmaker.close();
            console.log('# stopped due to error: %s', err);
        } else
        {
            console.log('# sent ' + msg.type);
            console.log('%s:%s',host,port);
            console.log(JSON.stringify(msg, null, 4));

            if (cb) cb();
        }
    });
}


