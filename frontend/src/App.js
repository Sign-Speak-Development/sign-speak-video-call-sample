import './input.css'
import {SignRecognition, SpeechRecognition} from "sign-speak-react-sdk";
import AgoraUIKit from "agora-react-uikit";
import { useEffect, useRef, useState } from 'react';
import { addToConversation, deleteConversation, getConversation } from './network';
import { produceSign, produceSpeech } from 'sign-speak-react-sdk/src/network/adapter';
import { createPortal } from 'react-dom';

const meetingID = "meetingID";
function App() {
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState("");
  const [convo, setConvo] = useState([]);
  const [video, setVideo] = useState("")
  const endOfScroll = useRef(null);
  const convoRef = useRef([]);

  const clear = () => {
    deleteConversation(meetingID);
  }
  const gotSign = (s) => {
    addToConversation(meetingID, name, "TEXT", s);
    produceSpeech(s, "MALE").then((blob) => {
      var reader = new FileReader();
      reader.readAsDataURL(blob); 
      reader.onloadend = function() {
        var base64data = "data:audio/mp3;base64," + reader.result.split(",")[1];
        addToConversation(meetingID, name, "AUDIO", base64data);
      }
    });
  }
  const gotSpeech = (s) => {
    addToConversation(meetingID, name, "TEXT", s);
    produceSign(s, "MALE").then((blob) => {
      var reader = new FileReader();
      reader.readAsDataURL(blob); 
      reader.onloadend = function() {
        var base64data = "data:video/mp4;base64," + reader.result.split(",")[1];
        addToConversation(meetingID, name, "VIDEO", base64data);
      }
    });
  }

  useEffect(() => {
    setInterval(() => {
      // Hack to check if the conversation has changed an update state accordingly. We do this
      // because we only want to rerender when something has actually changed, and setState would trigger a rerender.
      getConversation(meetingID).then((newConvo) => {
        if (JSON.stringify(convoRef.current) !== JSON.stringify(newConvo)) {
          convoRef.current = newConvo;
          setConvo(convoRef.current);
          
          // we need to wait for the actual element added is rendered. This is a super hacky way
          // to do this, as we don't have componentDidUpdate
          setTimeout(() => {
            if (endOfScroll.current != null) {
              endOfScroll.current.scrollIntoView({behavior: 'smooth'})
            }
          }, 50)

          if (newConvo[newConvo.length - 1].MESSAGE_TYPE === "AUDIO") {
            const audioElement = new Audio();
            audioElement.src = newConvo[newConvo.length - 1].MESSAGE;
            audioElement.play()
      
            audioElement.onended = () => {
              URL.revokeObjectURL(audioElement.src);
            };
          } else if (newConvo[newConvo.length - 1].MESSAGE_TYPE === "VIDEO") {
            let interval = setInterval(() => {
              if (document.getElementById("root")?.children[0]?.children[0]?.children[0]?.children[0]?.children[0] !== undefined ) {
                clearInterval(interval)
                setVideo(newConvo[newConvo.length - 1].MESSAGE)
              }
            }, 100)
          }
        }
      })
    }, 500)
  }, [])
  if (!joined) {
    return <div className="bg-slate-500 text-white w-[50vw] top-[25vh] left-[25vw] rounded-xl fixed">
      <div className="flex-row text-3xl m-auto p-5 mt-16">
        <center>
          Name: 
        <input onChange={e => setName(e.target.value.trim())} className="mx-3 w-[90%] bg-slate-500 text-white border rounded-lg p-2" />
        </center>
        <center>
          <button onClick={() => {
            setJoined(true)
          }} className="my-10 border p-5 rounded-lg mb-16">Continue</button>
        </center>
      </div>
    </div>

  }

  return <div style={{ display: "flex", flexDirection:"column", width: "100vw", height: "100vh" }}>
    {
      document.getElementById("root")?.children[0]?.children[0]?.children[0]?.children[0]?.children[0] !== undefined ? 
      createPortal(
        <div className={`flex flex-1 height-full width-full ${video === "" ? "hidden" : "visible"}`}>
          <div className="flex flex-1 relative">
            <p className="absolute bg-slate-400/55 p-1 m-0 bottom-0 right-0 z-10">Avatar</p>
            <div className="w-full flex flex-1">
              <div className="w-full h-full relative overflow-hidden">
                <video autoPlay={true} muted={true} src={video} className="bg-cover w-full h-full absolute left-0 top-0"/>
              </div>
            </div>
          </div>
        </div>,
        document.getElementById("root").children[0].children[0].children[0].children[0]
      ) : null
    }

  <div style={{ display: "flex", flexDirection:"column", width: "100vw", height: "90vh" }}>
      <AgoraUIKit styleProps={{
        theme: "white"  ,
        UIKitContainer: {
          backgroundColor: "black"
        },
        scrollViewContainer: {
          backgroundColor: "black"
        },
        localBtnContainer: {
          backgroundColor: "#131416",
        },
        localBtnStyles: {
          muteLocalAudio: {
            backgroundColor: "#232426",
            borderWidth: 0
          },
          muteLocalVideo: {
            backgroundColor: "#232426",
            borderWidth: 0
          },
          endCall: {
            backgroundColor: "#dd0006",
            borderWidth: 0
          }
        }
      }} rtcProps={{
        appId: "9fc11b84fb19458b84194cf0b91fb309",
        channel: meetingID,
        role: "host",
        layout: 0
      }} rtmProps={{
        displayUsername: true,
        username: name
      }} callbacks={{
        EndCall: () => setJoined(false),
      }} />
    </div>
    <div className="bg-black text-white flex flex-row">
      <div className="flex-[8] h-[10vh] overflow-y-scroll">
        {
            convo.filter(x => x.MESSAGE_TYPE === "TEXT").map(x => <p>{x.USER + ": " + x.MESSAGE}</p>)
        }
        <div ref={endOfScroll}/>
      </div>
      <div className="flex-1 flex-col">
        <SignRecognition includeFeedback={false} feedbackClassName={'bg-black'} cameraClassName='hidden' interpretationClassName='hidden' gotResult={gotSign}/>
        <SpeechRecognition transcriptionClassName='hidden' gotResult={gotSpeech}/>
        <button className="mt-2 p-3 mx-2 bg-sign-speak-teal rounded-lg font-semibold text-white" onClick={clear}>Reset Conversation</button>
      </div>
    </div>

  </div>
}

export default App;
