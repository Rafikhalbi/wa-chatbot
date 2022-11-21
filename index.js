const { Boom } = require('@hapi/boom');
const makeWASocket = require('@adiwajshing/baileys').default
const { BufferJSON, useMultiFileAuthState, DisconnectReason } = require('@adiwajshing/baileys');
const QRCode = require('qrcode');
const fs = require('fs');
const axios = require('axios');

async function connectToWhatsApp () {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    })
    // this will be called as soon as the credentials are updated
    sock.ev.on ('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if(connection === 'close') {
            if (typeof lastDisconnect !== 'undefined' && lastDisconnect !== null) {
                const shouldReconnect = typeof lastDisconnect !== 'undefined' && typeof lastDisconnect.error !== 'undefined' && typeof lastDisconnect.error.output !== 'undefined' && typeof lastDisconnect.error.output.statusCode !== 'undefined' && lastDisconnect.error.output.statusCode != DisconnectReason.loggedOut
                if(shouldReconnect) {
                    connectToWhatsApp()
                }
            }
        } else if(connection === 'open') {
            console.log('opened connection')
        }
    })
    sock.ev.on('messages.upsert', async ({messages}) => {
        const m = messages[0]
        if (!m.message) return // if there is no text or media message
        const messageType = Object.keys (m.message)[0]
        const mess = m.message[messageType]
        const urlApi = 'https://api.simsimi.net/v2/?text='+mess+'&lc=id'
        if (messageType === 'conversation') {
            if (typeof m.key.remoteJid !== 'undefined' &&  m.key.remoteJid !== null) {
                axios.get(urlApi)
                  .then( (response) => {
                    let rs = response.data['success']
                    sock.sendMessage(m.key.remoteJid, {text: rs})
                  });
               // await sock.sendMessage(m.key.remoteJid, {text: 'hii'})
            }
        } else {
            console.log(m)
        } 
    })
}
// run in main file
connectToWhatsApp()
