import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Button,
  Box,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import Input from "@mui/joy/Input";
import CloseIcon from "@mui/icons-material/Close";
import ReactMarkdown from "react-markdown";
import { useComponentStore } from "./stores/ZustandStores";
import { io, Socket } from "socket.io-client";

localStorage.debug = "socket.io-client:*";

interface ChatbotProps {
  isChatbotModalOpen: boolean;
  onChatbotModalClose: () => void;
  roomCode?: string;
  playerName?: string;
}

// Each chat message
type Message = {
  type: "user" | "bot" | "other";
  text: string;
  sender?: string; // e.g. "Player78" or an ID
  timestamp: number;
};

// Info we store for each other player from 'playerData'
type OtherPlayerInfo = {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
};

const ChatBotModal: React.FC<ChatbotProps> = (props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [chatMode, setChatMode] = useState<"ai" | "others">("ai");
  const [isConnected, setIsConnected] = useState(false);

  // We'll store all known "other players" from 'playerData'
  const [otherPlayers, setOtherPlayers] = useState<{
    [playerId: string]: OtherPlayerInfo;
  }>({});

  const { showCrosshair } = useComponentStore();

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // We'll keep two sockets:
  const chatSocketRef = useRef<Socket | null>(null); // For /chat
  const updateSocketRef = useRef<Socket | null>(null); // For /update

  // ==========================
  // 1) Connect to /chat
  // ==========================
  useEffect(() => {
    if (props.isChatbotModalOpen && chatMode === "others" && props.roomCode) {
      // Disconnect old chat socket if any
      if (chatSocketRef.current) {
        chatSocketRef.current.disconnect();
      }

      // Connect to /chat
      chatSocketRef.current = io("https://multiplayer-backend-8iex.onrender.com/chat", {
        transports: ["websocket", "polling"],
        path: "/socket.io",
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout:20000,
      });

      if (props.playerName) {
        // Make sure we emit to /chat namespace, not just /update
        chatSocketRef.current.emit("setName", props.playerName);
      }

      // Chat connection status
      chatSocketRef.current.on("connect", () => {
        console.log("Connected to chat server");
        setIsConnected(true);

        // Welcome message
        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            text: `Connected to room ${props.roomCode}`,
            timestamp: Date.now(),
          },
        ]);
      });

      chatSocketRef.current.on("connect_error", (error) => {
        console.error("Connection error:", error);
        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            text: "Failed to connect to chat server. Retrying...",
            timestamp: Date.now(),
          },
        ]);
      });

      chatSocketRef.current.on("reconnect_attempt", (attempt) => {
        console.log(`Reconnection attempt: ${attempt}`);
        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            text: `Reconnecting... (attempt ${attempt})`,
            timestamp: Date.now(),
          },
        ]);
      });

      chatSocketRef.current.on("reconnect", () => {
        console.log("Reconnected to chat server");
        setIsConnected(true);
        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            text: "Reconnected to chat server!",
            timestamp: Date.now(),
          },
        ]);

        // Rejoin the room
        if (props.roomCode && chatSocketRef.current) {
          chatSocketRef.current.emit("generateCode", props.roomCode);
        }
      });

      chatSocketRef.current.on("disconnect", () => {
        console.log("Disconnected from chat server");
        setIsConnected(false);
      });

      // Set user name
      if (props.playerName) {
        chatSocketRef.current.emit("setName", props.playerName);
        console.log(`User name set to: ${props.playerName}`);
      }

      // Join the chat room
      chatSocketRef.current.emit("generateCode", props.roomCode);
      console.log(`Joined room: ${props.roomCode}`);

      // Listen for broadcast messages
      chatSocketRef.current.on("broadcastMessage", (data) => {
        // `data` might have: data.id (the sender's ID) or data.name, etc.
        // If your server only sends `id`, you can look up the name in `otherPlayers[id]`.
        // If your server sends `name`, we can just use that.

        console.log("Received chat message:", data);

        // If your server sends: { id: 'xxxx', message: 'Hello', name: 'Player123' }
        // then we can do:
        const playerId = data.id;
        console.log("Player ID:", playerId);
        const fallbackName = data.name || "Unknown Player";

        // If we have them in otherPlayers, use that
        let resolvedName = fallbackName;
        if (playerId && otherPlayers[playerId]?.name) {
          resolvedName = otherPlayers[playerId].name;
        }
        // Otherwise, if we at least have an ID, build "Player" + last 4 characters
        else if (playerId) {
          const last4 = playerId.slice(0, 4); // e.g. "abcd"
          resolvedName = "Player " + last4.toUpperCase(); // => "Playerabcd"
        }

        setMessages((prev) => [
          ...prev,
          {
            type: "other",
            text: data.message,
            sender: resolvedName,
            timestamp: Date.now(),
          },
        ]);
      });

      return () => {
        if (chatSocketRef.current) {
          chatSocketRef.current.disconnect();
          console.log("Chat socket disconnected");
          setIsConnected(false);
        }
      };
    }
  }, [
    props.isChatbotModalOpen,
    chatMode,
    props.roomCode,
    props.playerName,
    otherPlayers,
  ]);

  // ==========================
  // 2) Connect to /update
  //    So we can receive 'playerData'
  // ==========================
  useEffect(() => {
    // We only need to connect to /update once, so let's do it on mount
    updateSocketRef.current = io("https://multiplayer-backend-8iex.onrender.com/update", {
      transports: ["websocket", "polling"],
      path: "/socket.io",
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout:20000,
    });

    updateSocketRef.current.on("connect", () => {
      console.log("Connected to /update namespace");
      // If we have a playerName, set it here as well
      if (props.playerName) {
        updateSocketRef.current?.emit("setName", props.playerName);
      }
    });

    // Whenever we get 'playerData', store the info so we know other players' names
    updateSocketRef.current.on("playerData", (players) => {
      // players is typically an array of objects:
      //  {
      //    id, name, position_x, position_y, position_z,
      //    quaternion_x, quaternion_y, quaternion_z, quaternion_w
      //  }
      console.log("Received player data:", players);

      const playersMap: { [id: string]: OtherPlayerInfo } = {};
      players.forEach((p: any) => {
        // Skip ourselves if p.id === updateSocketRef.current?.id (optional)
        playersMap[p.id] = {
          id: p.id,
          name: p.name, // e.g. "Player78"
          position: {
            x: p.position_x,
            y: p.position_y,
            z: p.position_z,
          },
          rotation: {
            x: p.quaternion_x,
            y: p.quaternion_y,
            z: p.quaternion_z,
            w: p.quaternion_w,
          },
        };
      });
      setOtherPlayers(playersMap);
    });

    // Cleanup on unmount
    return () => {
      if (updateSocketRef.current) {
        updateSocketRef.current.disconnect();
        console.log("Update socket disconnected");
      }
    };
  }, [props.playerName]);

  // ==========================
  // 3) Focus input when modal opens
  // ==========================
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    if (props.isChatbotModalOpen) {
      setTimeout(focusInput, 100);
    }
  }, [props.isChatbotModalOpen, chatMode]);

  // ==========================
  // 4) Sending messages
  // ==========================
  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    const timestamp = Date.now();

    // Show our own message
    setMessages((prev) => [
      ...prev,
      {
        type: "user",
        text: currentMessage,
        timestamp,
      },
    ]);

    if (chatMode === "ai") {
      try {
        // Example AI endpoint
        const response = await fetch(
          "https://function-1-864197837687.asia-south1.run.app",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userInput: currentMessage }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const botMessage =
            data.response || "I'm sorry, I couldn't process that.";

          setMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: botMessage,
              timestamp: Date.now(),
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Failed to communicate with the chatbot.",
              timestamp: Date.now(),
            },
          ]);
        }
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            text: "An error occurred while communicating with the chatbot.",
            timestamp: Date.now(),
          },
        ]);
      }
    } else if (
      chatMode === "others" &&
      chatSocketRef.current &&
      props.roomCode
    ) {
      // Send to the chat server
      console.log(
        "Sending message:",
        currentMessage,
        "to room:",
        props.roomCode
      );
      chatSocketRef.current.emit("sendMessage", {
        message: currentMessage,
        roomName: props.roomCode,
      });
    }

    setCurrentMessage("");
    focusInput();
  };

  // ==========================
  // 5) Switch chat modes
  // ==========================
  const handleChatModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: "ai" | "others"
  ) => {
    if (newMode !== null) {
      setChatMode(newMode);
      setMessages([]); // Clear messages on mode switch

      // Initial message
      if (newMode === "ai") {
        setMessages([
          {
            type: "bot",
            text: "Hello! I'm Fox AI. How can I help you today?",
            timestamp: Date.now(),
          },
        ]);
      } else if (newMode === "others" && props.roomCode) {
        setMessages([
          {
            type: "bot",
            text: `Connecting to room ${props.roomCode}...`,
            timestamp: Date.now(),
          },
        ]);
      }

      focusInput();
    }
  };

  // ==========================
  // 6) Prevent background scrolling while modal is open
  // ==========================
  useEffect(() => {
    if (props.isChatbotModalOpen) {
      const scrollY = window.scrollY;
      const joystickZone = document.getElementById("joystickZone");

      if (joystickZone) {
        joystickZone.style.display = "none";
      }

      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";

      return () => {
        if (joystickZone) {
          joystickZone.style.display = "block";
        }

        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        document.body.style.touchAction = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [props.isChatbotModalOpen]);

  // ==========================
  // 7) Auto-scroll to bottom on new messages
  // ==========================
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  if (!props.isChatbotModalOpen) return null;

  return (
    <Card
      sx={{
        position: "fixed",
        bottom: "1.5%",
        right: "1.5%",
        width: { xs: "90vw", sm: "40vw", lg: "25vw", md: "30vw" },
        height: "60vh",
        display: "flex",
        flexDirection: "column",
        backdropFilter: "blur(10px)",
        borderRadius: "10px",
        boxShadow: 4,
        overflow: "hidden",
        pointerEvents: "auto",
        zIndex: 9999,
      }}
    >
      {/* Header */}
      <CardContent
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "3px solid rgba(0, 0, 0, 0.1)",
          padding: "16px",
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <img
            src="/fox-logo.png"
            alt="Logo"
            style={{ width: "30px", height: "30px" }}
          />
          <Typography
            sx={{
              fontWeight: "bold",
              fontSize: "1.2rem",
              fontFamily: "'Poppins', sans-serif",
              paddingLeft: "10px",
            }}
          >
            FOX CHAT
          </Typography>
        </Box>

        <ToggleButtonGroup
          value={chatMode}
          exclusive
          onChange={handleChatModeChange}
          size="small"
          sx={{ mx: 1 }}
        >
          <ToggleButton
            value="ai"
            sx={{
              fontSize: "0.75rem",
              px: 1,
              py: 0.5,
              fontFamily: "'Poppins', sans-serif",
              backgroundColor: chatMode === "ai" ? "#e2441e" : "transparent",
              color: chatMode === "ai" ? "white" : "inherit",
              "&.Mui-selected": {
                backgroundColor: "#e2441e",
                color: "white",
              },
              "&:hover": {
                backgroundColor:
                  chatMode === "ai" ? "#e2441e" : "rgba(226, 68, 30, 0.2)",
              },
            }}
          >
            Chat with AI
          </ToggleButton>
          <ToggleButton
            value="others"
            sx={{
              fontSize: "0.75rem",
              px: 1,
              py: 0.5,
              fontFamily: "'Poppins', sans-serif",
              backgroundColor:
                chatMode === "others" ? "#e2441e" : "transparent",
              color: chatMode === "others" ? "white" : "inherit",
              "&.Mui-selected": {
                backgroundColor: "#e2441e",
                color: "white",
              },
              "&:hover": {
                backgroundColor:
                  chatMode === "others" ? "#e2441e" : "rgba(226, 68, 30, 0.2)",
              },
            }}
          >
            Chat with Others
          </ToggleButton>
        </ToggleButtonGroup>

        <IconButton
          onPointerDown={() => {
            props.onChatbotModalClose();
            showCrosshair();
          }}
          size="small"
          sx={{
            borderRadius: "50%",
            backgroundColor: "#9f9f9f",
            color: "black",
            width: "1.5rem",
            height: "1.5rem",
            "&:hover": { backgroundColor: "#eeeeee", color: "black" },
          }}
        >
          <CloseIcon
            sx={{
              height: "1rem",
            }}
          />
        </IconButton>
      </CardContent>

      {/* Chat area */}
      <CardContent
        ref={chatContainerRef}
        sx={{
          flex: 1,
          overflowY: "auto",
          padding: 2,
          display: "flex",
          flexDirection: "column",
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
          backgroundColor: "rgba(245, 245, 245, 0.9)",
        }}
      >
        {/* If no messages yet, show a placeholder */}
        {messages.length === 0 && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              opacity: 0.5,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {chatMode === "ai"
                ? "Start a conversation with Fox AI"
                : props.roomCode
                ? `Start chatting in room ${props.roomCode}`
                : "No room code available"}
            </Typography>
          </Box>
        )}

        {/* List of messages */}
        {messages.map((message, index) => {
          let senderLabel = "";
          if (message.type === "user") {
            // If it's your own message
            senderLabel = props.playerName || "You";
          } else if (message.type === "other") {
            // Possibly from server data, or from otherPlayers
            senderLabel = message.sender || "Unknown";
          } else {
            // Bot or AI
            senderLabel = "Fox AI";
          }

          return (
            <Box
              key={index}
              sx={{
                display: "flex",
                justifyContent:
                  message.type === "user" ? "flex-end" : "flex-start",
                marginBottom: 1,
              }}
            >
              <Box
                sx={{
                  maxWidth: "70%",
                  padding: 1,
                  borderRadius: "10px",
                  backgroundColor:
                    message.type === "user"
                      ? "#e2441e"
                      : message.type === "other"
                      ? "#FF8164"
                      : "rgba(0, 0, 0, 0.1)",
                  color:
                    message.type === "user" || message.type === "other"
                      ? "white"
                      : "black",
                  wordWrap: "break-word",
                }}
              >
                {/* Sender name label */}
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    fontWeight: "bold",
                    fontFamily: "'Poppins', sans-serif",
                    marginBottom: "2px",
                  }}
                >
                  {senderLabel}
                </Typography>

                {/* Message text (Markdown) */}
                <div>
                  <ReactMarkdown>{message.text}</ReactMarkdown>
                </div>

                {/* Timestamp */}
                <Typography
                  sx={{
                    fontSize: "0.6rem",
                    color:
                      message.type === "user" || message.type === "other"
                        ? "rgba(255, 255, 255, 0.7)"
                        : "rgba(0, 0, 0, 0.5)",
                    textAlign: "right",
                    mt: 0.5,
                  }}
                >
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </CardContent>

      {/* Connection status indicator */}
      {chatMode === "others" && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            padding: "4px 16px",
            backgroundColor: isConnected
              ? "rgba(46, 125, 50, 0.1)"
              : "rgba(211, 47, 47, 0.1)",
            borderTop: "1px solid rgba(0, 0, 0, 0.1)",
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: isConnected ? "#2e7d32" : "#d32f2f",
              mr: 1,
            }}
          />
          <Typography
            sx={{
              fontSize: "0.7rem",
              color: isConnected ? "#2e7d32" : "#d32f2f",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            {isConnected
              ? `Connected to room: ${props.roomCode}`
              : "Disconnected"}
          </Typography>
        </Box>
      )}

      {/* Footer: input area */}
      <CardActions
        sx={{
          display: "flex",
          alignItems: "center",
          padding: "8px",
          borderTop: "3px solid rgba(0, 0, 0, 0.1)",
          gap: 1,
          backgroundColor: "white",
        }}
      >
        <Input
          placeholder={
            chatMode === "ai" ? "Ask Fox AI..." : "Message other players..."
          }
          value={currentMessage}
          ref={inputRef}
          onChange={(e) => setCurrentMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") handleSendMessage();
          }}
          sx={{
            flex: 1,
            padding: 1.5,
            fontFamily: "'Poppins', sans-serif",
          }}
        />
        <Button
          sx={{
            color: "white",
            backgroundColor: "#e2441e",
            padding: 1.5,
            fontFamily: "'Poppins', sans-serif",
            "&:hover": {
              backgroundColor: "#c23718",
            },
          }}
          onPointerDown={handleSendMessage}
        >
          Send
        </Button>
      </CardActions>
    </Card>
  );
};

export default ChatBotModal;
