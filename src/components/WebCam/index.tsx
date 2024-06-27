"use client";
import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Webcam from "react-webcam";
import { useRouter } from "next/navigation";
import axios from "axios";

const domain = "http://localhost:8188";

function WebcamStream() {
  const webcamRef = useRef<Webcam>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState();

  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [prompt, setPrompt] = useState<string>("");
  const [workflow, setWorkflow] = useState<string>("");

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

  const showRecorder = () => {
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

  useEffect(() => {
    // Clear the uploaded files and file error when workflow changes
    setUploadedFiles([]);
    setFileError(null);
  }, [workflow]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      if (workflow === "workflow2") {
        if (files.length !== 1) {
          setFileError("Please upload exactly 1 video.");
          return;
        }

        const validTypes = ["video/mp4", "video/webm"];
        if (!validTypes.includes(files[0].type)) {
          setFileError("Only MP4 and WEBM files are allowed.");
          return;
        }

        // Clear the error if validation passes
        setFileError(null);
        // Store the file in the state
        setUploadedFiles(Array.from(files));
      } else {
        if (files.length !== 4) {
          setFileError("Please upload exactly 4 images.");
          return;
        }

        const validTypes = ["image/jpeg", "image/png"];
        for (let i = 0; i < files.length; i++) {
          if (!validTypes.includes(files[i].type)) {
            setFileError("Only JPG and PNG files are allowed.");
            return;
          }
        }

        // Clear the error if validation passes
        setFileError(null);
        // Store the files in the state
        setUploadedFiles(Array.from(files));
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (workflow === "workflow2") {
      if (uploadedFiles.length !== 1) {
        setFileError("Please upload exactly 1 video.");
        return;
      }
    } else {
      if (uploadedFiles.length !== 4) {
        setFileError("Please upload exactly 4 images.");
        return;
      }
    }

    const formData = new FormData();
    uploadedFiles.forEach((file) => {
      formData.append("files", file);
    });
    formData.append("prompt", prompt);
    formData.append("workflow", workflow);

    try {
      const response = await fetch("/your-backend-endpoint", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to submit data");
      }

      const result = await response.json();
      console.log("Success:", result);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-7.5 2xl:gap-7.5">
        <div className="col-span-12 rounded-sm border border-stroke bg-white px-5 pb-5 pt-7.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:col-span-6">
          <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
            <div className="mb-4 flex w-full flex-wrap gap-3 sm:gap-5">
              <div className="flex min-w-47.5">
                <div className="w-full">
                  <div>
                    <h4 className="text-xl font-semibold text-black dark:text-white">
                      Upload Images:
                    </h4>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div
              id="FileUpload"
              className="relative mb-5.5 block w-full cursor-pointer appearance-none rounded border border-dashed border-primary bg-gray px-4 py-4 dark:bg-meta-4 sm:py-7.5"
            >
              <input
                type="file"
                accept={
                  workflow === "workflow2"
                    ? "video/mp4,video/webm"
                    : ".jpg,.jpeg,.png"
                }
                className="absolute inset-0 z-50 m-0 h-full w-full cursor-pointer p-0 opacity-0 outline-none"
                multiple={workflow !== "workflow2"}
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center justify-center space-y-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-stroke bg-white dark:border-strokedark dark:bg-boxdark">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M1.99967 9.33337C2.36786 9.33337 2.66634 9.63185 2.66634 10V12.6667C2.66634 12.8435 2.73658 13.0131 2.8616 13.1381C2.98663 13.2631 3.1562 13.3334 3.33301 13.3334H12.6663C12.8431 13.3334 13.0127 13.2631 13.1377 13.1381C13.2628 13.0131 13.333 12.8435 13.333 12.6667V10C13.333 9.63185 13.6315 9.33337 13.9997 9.33337C14.3679 9.33337 14.6663 9.63185 14.6663 10V12.6667C14.6663 13.1971 14.4556 13.7058 14.0806 14.0809C13.7055 14.456 13.1968 14.6667 12.6663 14.6667H3.33301C2.80257 14.6667 2.29387 14.456 1.91879 14.0809C1.54372 13.7058 1.33301 13.1971 1.33301 12.6667V10C1.33301 9.63185 1.63148 9.33337 1.99967 9.33337Z"
                      fill="#3C50E0"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M7.5286 1.52864C7.78894 1.26829 8.21106 1.26829 8.4714 1.52864L11.8047 4.86197C12.0651 5.12232 12.0651 5.54443 11.8047 5.80478C11.5444 6.06513 11.1223 6.06513 10.8619 5.80478L8 2.94285L5.13807 5.80478C4.87772 6.06513 4.45561 6.06513 4.19526 5.80478C3.93491 5.54443 3.93491 5.12232 4.19526 4.86197L7.5286 1.52864Z"
                      fill="#3C50E0"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M7.99967 1.33337C8.36786 1.33337 8.66634 1.63185 8.66634 2.00004V10C8.66634 10.3682 8.36786 10.6667 7.99967 10.6667C7.63148 10.6667 7.33301 10.3682 7.33301 10V2.00004C7.33301 1.63185 7.63148 1.33337 7.99967 1.33337Z"
                      fill="#3C50E0"
                    />
                  </svg>
                </span>
                <p>
                  <span className="text-primary">Click to upload</span> or drag
                  and drop
                </p>
                <p className="mt-1.5">
                  {workflow === "workflow2"
                    ? "Only MP4 and WEBM files are allowed"
                    : "Only PNG and JPG files are allowed"}
                </p>
                {fileError && <p className="mt-2 text-red">{fileError}</p>}
              </div>
            </div>
            <div>
              <div className="mt-4">
                {uploadedFiles.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-lg font-semibold">
                      Uploaded Files:
                    </h3>
                    <ul className="flex space-x-4">
                      {uploadedFiles.map((file, index) => (
                        <li key={index} className="flex flex-col items-center">
                          {workflow === "workflow2" ? (
                            <video
                              src={URL.createObjectURL(file)}
                              controls
                              className="mb-1 h-32 w-32 object-cover"
                            />
                          ) : (
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`uploaded-${index}`}
                              className="mb-1 h-32 w-32 object-cover"
                            />
                          )}
                          <p>{file.name}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-12 rounded-sm border border-stroke bg-white p-7.5 shadow-default dark:border-strokedark dark:bg-boxdark xl:col-span-6">
          <div className="mb-4 justify-between gap-4 sm:flex">
            <div>
              <h4 className="text-xl font-semibold text-black dark:text-white">
                Enter Prompt:
              </h4>
            </div>
          </div>

          <div className="mb-5.5">
            <div className="relative">
              <span className="absolute left-4.5 top-4">
                <svg
                  className="fill-current"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g opacity="0.8" clipPath="url(#clip0_88_10224)">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M1.56524 3.23223C2.03408 2.76339 2.66997 2.5 3.33301 2.5H9.16634C9.62658 2.5 9.99967 2.8731 9.99967 3.33333C9.99967 3.79357 9.62658 4.16667 9.16634 4.16667H3.33301C3.11199 4.16667 2.90003 4.25446 2.74375 4.41074C2.58747 4.56702 2.49967 4.77899 2.49967 5V16.6667C2.49967 16.8877 2.58747 17.0996 2.74375 17.2559C2.90003 17.4122 3.11199 17.5 3.33301 17.5H14.9997C15.2207 17.5 15.4326 17.4122 15.5889 17.2559C15.7452 17.0996 15.833 16.8877 15.833 16.6667V10.8333C15.833 10.3731 16.2061 10 16.6663 10C17.1266 10 17.4997 10.3731 17.4997 10.8333V16.6667C17.4997 17.3297 17.2363 17.9656 16.7674 18.4344C16.2986 18.9033 15.6627 19.1667 14.9997 19.1667H3.33301C2.66997 19.1667 2.03408 18.9033 1.56524 18.4344C1.0964 17.9656 0.833008 17.3297 0.833008 16.6667V5C0.833008 4.33696 1.0964 3.70107 1.56524 3.23223Z"
                      fill=""
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M16.6664 2.39884C16.4185 2.39884 16.1809 2.49729 16.0056 2.67253L8.25216 10.426L7.81167 12.188L9.57365 11.7475L17.3271 3.99402C17.5023 3.81878 17.6008 3.5811 17.6008 3.33328C17.6008 3.08545 17.5023 2.84777 17.3271 2.67253C17.1519 2.49729 16.9142 2.39884 16.6664 2.39884ZM14.8271 1.49402C15.3149 1.00622 15.9765 0.732178 16.6664 0.732178C17.3562 0.732178 18.0178 1.00622 18.5056 1.49402C18.9934 1.98182 19.2675 2.64342 19.2675 3.33328C19.2675 4.02313 18.9934 4.68473 18.5056 5.17253L10.5889 13.0892C10.4821 13.196 10.3483 13.2718 10.2018 13.3084L6.86847 14.1417C6.58449 14.2127 6.28409 14.1295 6.0771 13.9225C5.87012 13.7156 5.78691 13.4151 5.85791 13.1312L6.69124 9.79783C6.72787 9.65131 6.80364 9.51749 6.91044 9.41069L14.8271 1.49402Z"
                      fill=""
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_88_10224">
                      <rect width="20" height="20" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </span>

              <textarea
                className="w-full rounded border border-stroke bg-gray py-3 pl-11.5 pr-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                name="bio"
                id="bio"
                rows={6}
                placeholder="Write your prompt here"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              ></textarea>
            </div>
          </div>
        </div>
        <div className="col-span-12 h-full rounded-sm border border-stroke bg-white px-7.5 py-6 shadow-default dark:border-strokedark dark:bg-boxdark xl:col-span-12">
          <h4 className="mb-2 text-xl font-semibold text-black dark:text-white">
            Preview Video:
          </h4>
          <div className="flex justify-center">
            <Image
              width={400}
              height={400}
              src={"/images/illustration/illustration-placeholder.svg"}
              alt="placeholder"
              priority
            />
          </div>
          <div className="mt-4 flex justify-end gap-4.5">
            <button
              className="flex justify-center rounded border border-stroke px-6 py-2 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
              type="button"
              onClick={() => {
                setUploadedFiles([]);
                setPrompt("");
                setWorkflow("");
                setFileError(null);
              }}
            >
              Reset
            </button>
            <button
              className="flex justify-center rounded bg-primary px-6 py-2 font-medium text-gray hover:bg-opacity-90"
              type="submit"
            >
              Record
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

export default WebcamStream;
