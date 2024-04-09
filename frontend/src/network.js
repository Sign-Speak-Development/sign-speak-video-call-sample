import axios, { ResponseType } from "axios";
const ADDRESS = "https://vid-call-backend.sign-speak-dev.com"

export async function getConversation(roomID) {
    let log = (await axios.get(ADDRESS + "/conversation/" + roomID)).data;
    return log.map((x) => {
        return {
            "USER": x[0],
            "MESSAGE_TYPE": x[1],
            "MESSAGE": x[2]
        }
    })
}
export async function addToConversation(roomID, user, message_type, message) {
    await axios({
        url: ADDRESS + "/conversation/" + roomID, 
        data: [user, message_type, message],
        method: 'post'
    })
}
export async function deleteConversation(roomID) {
    await axios.delete(ADDRESS + "/conversation/" + roomID);
    window.location.reload()
}