"use client";
import React, { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import { useRouter } from "next/navigation";
import axios from "axios";

const domain = "http://localhost:8188";
import workflow from "../../../Videoboothtest.json";
import { stringify } from "querystring";
function WebcamStream() {
  const webcamRef = useRef<Webcam>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState();
  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user",
  };

  const startRecording = () => {
    setIsRecording(true);
    setCountdown(3);
  };

  const stopRecording = () => {
    const mediaStream = webcamRef.current?.stream;
    if (mediaStream) {
      const tracks = mediaStream.getTracks();
      tracks.forEach((track) => track.stop());
    }
    setIsRecording(false);
  };

  const [filename, setFilename] = useState<string>();

  const uploadVideo = async (blob: Blob) => {
    const uploadUrl = `${domain}/upload/image`;

    const formData = new FormData();

    const file = new File([blob], Date.now().toString() + ".mp4", {
      type: "video/mp4",
    });
    formData.append("image", file);
    formData.append("type", "input");

    try {
      const response = await axios.post(uploadUrl, formData);

      const { name } = response.data;
      console.log("Video uploaded successfully:", response.data);
      await new Promise((res) => setTimeout(res, 1000));
      downloadVideo(name, blob);
      await queuePrompt(name);
    } catch (error) {
      console.error("Error uploading video:", error);
    }
  };

  const queuePrompt = async (filename: string) => {
    setLoading(true);
    try {
      let seed = "";
      for (let i = 0; i < 15; i++) {
        seed += Math.floor(Math.random() * 10).toString();
      }
      workflow[111].inputs.noise_seed = Number(seed);
      //
      workflow[107].inputs.video = `ComfyUI/input/` + filename;

      const response = await fetch(`${domain}/prompt`, {
        method: "POST",
        body: JSON.stringify({ prompt: workflow }),
      });
      if (!response.ok) {
        throw "Prompting failed";
      }
      const { prompt_id } = await response.json();

      localStorage.setItem("promptId", prompt_id);
      router.push("/viewVideoBoothVideo"); ///////////////// REDIRECT?
    } catch (err) {
      console.error("Error generating video:", error);
    } finally {
      setLoading(false);
    }
  };
  const downloadVideo = (name: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  };
  useEffect(() => {
    let countdownTimer: NodeJS.Timeout;
    let recordingTimer: NodeJS.Timeout;

    if (isRecording) {
      if (countdown > 0) {
        countdownTimer = setTimeout(() => setCountdown(countdown - 1), 1000);
      } else {
        const mediaStream = webcamRef.current?.stream;
        if (mediaStream) {
          const mediaRecorder = new MediaRecorder(mediaStream, {
            mimeType: "video/webm",
          });

          const chunks: Blob[] = [];
          mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
          mediaRecorder.onstop = async () => {
            const recordedBlob = new Blob(chunks, { type: "video/webm" });
            await uploadVideo(recordedBlob);
          };

          mediaRecorder.start();
          recordingTimer = setTimeout(() => {
            mediaRecorder.stop();
            stopRecording();
          }, 6000);
        }
      }
    }

    return () => {
      clearTimeout(countdownTimer);
      clearTimeout(recordingTimer);
    };
  }, [isRecording, countdown]);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <Webcam
        audio={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
        ref={webcamRef}
        videoConstraints={videoConstraints}
      />
      {isRecording && countdown > 0 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "80px",
            fontWeight: "bold",
            color: "white",
            textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
            zIndex: 10,
          }}
        >
          {countdown}
        </div>
      )}

      <button
        style={{
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          padding: "10px 20px",
          background: "rgba(0, 0, 0, 0.5)",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
        onClick={startRecording}
        disabled={isRecording}
      >
        {isRecording ? "Recording..." : "Start Recording"}
      </button>
      <button
        style={{
          position: "absolute",
          bottom: "20px",
          left: "10%",
          transform: "translateX(-50%)",
          padding: "10px 20px",
          background: "rgba(0, 0, 0, 0.5)",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
        onClick={() => router.push("/")}
      >
        Back
      </button>
    </div>
  );
}

export default WebcamStream;
