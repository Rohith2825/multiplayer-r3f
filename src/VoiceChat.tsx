import React, { useEffect, useRef, useState } from "react";
import Peer from "peerjs";
import { io, Socket } from "socket.io-client";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface VoiceChatProps {
  /**
   * The room code for your voice chat.
   * Everyone with the same roomCode can hear each other.
   */
  roomCode: string;
  className?: string;

  /**
   * An optional player name if you want to call socket.emit("setName", ...)
   * on the /chat namespace.
   */
  playerName?: string;

  /**
   * Icon paths for when the mic is off/on.
   */
  micOffIcon: string;
  micOnIcon: string;

  /**
   * Base URL of your Socket.IO server.
   * Defaults to "http://localhost:3001/" if not provided.
   */
  socketServerUrl?: string;

  /**
   * PeerJS server settings. By default: host=localhost, port=9000, path="/"
   */
  peerServer?: {
    host: string;
    port: number;
    path: string;
  };

  /**
   * (Optional) Inline styles or CSS class if you want to position
   * this mic icon differently.
   */
  style?: React.CSSProperties;
}

const VoiceChat: React.FC<VoiceChatProps> = ({
  roomCode,
  playerName,
  className,
  micOffIcon,
  micOnIcon,
  socketServerUrl = "http://localhost:3001/",
  peerServer = { host: "localhost", port: 9000, path: "/" },
  style,
}) => {
  // Is our mic currently on?
  const [isMicOn, setIsMicOn] = useState(false);

  // We'll store the local audio stream here when mic is on
  const localStreamRef = useRef<MediaStream | null>(null);

  // Our PeerJS instance (created when mic is on)
  const peerRef = useRef<Peer | null>(null);

  // Our chat socket (for signaling: joinVoiceRoom, newVoicePeer, etc.)
  const chatSocketRef = useRef<Socket | null>(null);

  // We'll track remote audio elements so we can remove them when mic is off
  const [remoteAudios, setRemoteAudios] = useState<{
    [peerId: string]: HTMLAudioElement;
  }>({});

  // 1) Connect to Socket.IO (/chat) exactly once
  useEffect(() => {
    const socket = io(`${socketServerUrl}/chat`, {
      transports: ["websocket", "polling"],
      path: "/socket.io",
    });
    chatSocketRef.current = socket;

    socket.on("connect", () => {
      console.log("[VoiceChat] Connected to /chat:", socket.id);
      // Optionally set player's name on chat socket
      if (playerName) {
        socket.emit("setName", playerName);
      }
    });

    // Another user joined => we call them
    socket.on("newVoicePeer", (newPeerId: string) => {
      console.log("[VoiceChat] newVoicePeer =>", newPeerId);
      callPeer(newPeerId);
    });

    // We get existing peers => we call each of them
    socket.on("existingVoicePeers", (peers: string[]) => {
      console.log("[VoiceChat] existingVoicePeers =>", peers);
      peers.forEach((p) => {
        if (p !== socket.id) {
          callPeer(p);
        }
      });
    });

    return () => {
      socket.disconnect();
      chatSocketRef.current = null;
    };
  }, [socketServerUrl, playerName]);

  // 2) "callPeer" => place a WebRTC call to a peer, sending them our local audio
  const callPeer = (peerId: string) => {
    if (!peerRef.current || !localStreamRef.current || !isMicOn) return;
    console.log("[VoiceChat] calling", peerId);

    const call = peerRef.current.call(peerId, localStreamRef.current);
    call.on("stream", (remoteStream) => {
      playRemoteStream(peerId, remoteStream);
    });
  };

  // 3) "playRemoteStream" => attach a remote stream to an audio element
  const playRemoteStream = (peerId: string, remoteStream: MediaStream) => {
    console.log("[VoiceChat] got remote stream from", peerId);
    setRemoteAudios((prev) => {
      // If we already have an audio tag for them, reuse it
      if (prev[peerId]) {
        prev[peerId].srcObject = remoteStream;
        prev[peerId].play().catch((err) => console.error("play error:", err));
        return { ...prev };
      } else {
        const audioElem = document.createElement("audio");
        audioElem.srcObject = remoteStream;
        audioElem.autoplay = true;
        document.body.appendChild(audioElem);
        audioElem.play().catch((err) => console.error("play error:", err));
        return { ...prev, [peerId]: audioElem };
      }
    });
  };

  // 4) "toggleMic" => user clicks mic icon
  const toggleMic = async () => {
    // Check if roomCode is valid
    if (!roomCode || roomCode.trim() === "") {
      toast.warning("Please join or create a room before using the mic.");
      return;
    }

    if (isMicOn) {
      // Turn mic OFF
      setIsMicOn(false);

      // Stop local tracks
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;

      // Destroy peer
      peerRef.current?.destroy();
      peerRef.current = null;

      // Remove remote audio elements
      Object.values(remoteAudios).forEach((audioElem) => {
        audioElem.pause();
        audioElem.srcObject = null;
        document.body.removeChild(audioElem);
      });
      setRemoteAudios({});

      return;
    }

    // Turn mic ON
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
        },
      });
      console.log("[VoiceChat] Local stream acquired:", stream);
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach((track, i) => {
        console.log(`Track ${i}:`, track.label, track.getSettings());
      });
      localStreamRef.current = stream;

      // Create Peer using PeerJS Cloud (default)
      const newPeer = new Peer();

      // On open => join the voice room
      newPeer.on("open", (myId) => {
        console.log("[VoiceChat] PeerJS open =>", myId);
        chatSocketRef.current?.emit("joinVoiceRoom", roomCode);
      });

      // On incoming call => answer with our local stream
      newPeer.on("call", (call) => {
        console.log("[VoiceChat] incoming call from", call.peer);
        call.answer(stream);
        call.on("stream", (remoteStream) => {
          playRemoteStream(call.peer, remoteStream);
        });
      });

      peerRef.current = newPeer;
      setIsMicOn(true);
    } catch (err) {
      console.error("[VoiceChat] Error accessing microphone:", err);
      toast.error("Error accessing microphone. Please check your settings.");
    }
  };

  return (
    <img
      src={isMicOn ? micOnIcon : micOffIcon}
      alt="Mic"
      className={className}
      onClick={toggleMic}
      style={style}
    />
  );
};

export default VoiceChat;
