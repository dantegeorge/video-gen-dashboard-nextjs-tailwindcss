import React, { useState, useEffect } from "react";
import Image from "next/image";
import axios from "axios";
import IP2Vidworkflow_api from "../../../IP2Vidworkflow_api.json";
export async function connectToComfyUI(clientId: string): Promise<WebSocket> {
  return new Promise<WebSocket>((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:8188/ws?clientId=${clientId}`);


const FormOne = () => {

    ws.onopen = () => {
      console.log("WebSocket connection established");
      resolve(ws);
    };

    ws.onerror = (error) => {
      console.error("WebSocket connection error:", error);
      reject(error);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };
  });
}

const ChartOne: React.FC = () => {

  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [prompt, setPrompt] = useState<string>("");
  const [workflow, setWorkflow] = useState<string>("");

  // WebSocket state
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>("");

  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Function to initialize WebSocket connection
  const connectWebSocket = (clientId: string) => {
    const wsUrl = `ws://localhost:8188/ws?clientId=${clientId}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log("WebSocket connected");
    };

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const {
        type,
        data: { value: current, max, prompt_id },
      } = message;

      if (type === "progress") {
        if (max > 1) {
          console.log(`Progress: ${current} out of ${max}`);
          setProgress((current * 100) / max); // Calculate progress percentage

          if (current === max) {
            console.log("Prompt is completed");
            setStatus("dequeued");
          }
        } else {
          console.log("Preparing models and nodes");
          setProgress(10);
        }
      } else if (type === "executing") {
        console.log("Prompt was executed");
        setStatus("executed");
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    websocket.onclose = () => {
      console.log("WebSocket connection closed");
    };

    setWs(websocket);
  };

  useEffect(() => {
    // Cleanup function to close WebSocket connection
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

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

    // Validate uploaded files
    if (workflow === "workflow1" && uploadedFiles.length !== 4) {
      setFileError("Please upload exactly 4 images.");
      return;
    } else if (workflow === "workflow2" && uploadedFiles.length !== 1) {
      setFileError("Please upload exactly 1 video.");
      return;
    }

    setIsGenerating(true); // Set generating status to true

    try {
      let copy;

      if (workflow === "workflow1") {
        // Upload the files and get their filenames
        const uploadedFilenames = await Promise.all(
          uploadedFiles.map(async (file) => {
            const formData = new FormData();
            formData.append("image", file);
            const response = await axios.post(
              `http://localhost:8188/upload/image`,
              formData,
            );
            return response.data.name; // Adjust this according to your backend response structure
          }),
        );

        // Deep copy the workflow structure for workflow1
        copy = JSON.parse(JSON.stringify(IP2Vidworkflow_api));
        copy[12].inputs.image = `${uploadedFilenames[0]}`;
        copy[27].inputs.image = `${uploadedFilenames[1]}`;
        copy[58].inputs.image = `${uploadedFilenames[2]}`;
        copy[67].inputs.image = `${uploadedFilenames[3]}`;
        copy[4].inputs.text = prompt;

        let seed = "";
        for (let i = 0; i < 15; i++) {
          seed += Math.floor(Math.random() * 10).toString();
        }
        copy[1].inputs.noise_seed = Number(seed);
      } else if (workflow === "workflow2") {
        // Deep copy the workflow structure for workflow2
        copy = JSON.parse(JSON.stringify(workflow));
        const { vidFileName, imgFileName } = await uploadVideoAndImage(); // Custom function to upload video and image

        copy[107].inputs.video = `ComfyUI/input/${vidFileName}`;
        copy[154].inputs.image = `${imgFileName}`;
        copy[3].inputs.text = prompt;

        let seed = "";
        for (let i = 0; i < 15; i++) {
          seed += Math.floor(Math.random() * 10).toString();
        }
        copy[111].inputs.noise_seed = Number(seed);
      }

      // Send the modified workflow to the server
      const { data } = await axios.post(`http://localhost:8188/prompt`, {
        prompt: copy,
      });

      const clientId = data["prompt_id"];

      // Connect to WebSocket server using the generated client ID
      const ws = await connectToComfyUI(clientId);
      console.log("WebSocket connection established with Diffusion model");

      // Example: Handle incoming messages
      ws.onmessage = async (event) => {
        console.log("Received data from Diffusion model:", event.data);
        // Once the generation is done, fetch the generated content URL
        const result = await fetchGeneratedImg2VidContent(clientId);
        setGeneratedUrl(result.url);
        setIsGenerating(false); // Set generating status to false once done
      };

      // Send initialization message to the WebSocket server
      ws.send(
        JSON.stringify({ type: "init", message: "Hello, Diffusion model!" }),
      );

      // Optional: Return client ID or handle success
    } catch (error) {
      console.error("Error:", error);
      setIsGenerating(false); // Ensure status is reset in case of error
    }
  };
  async function uploadVideoAndImage() {
    try {
      // Implement video and image upload logic here
      const vidFileName = ""; // Upload video and get filename
      const imgFileName = ""; // Upload image and get filename

      return { vidFileName, imgFileName };
    } catch (error) {
      console.error("Error uploading video and image:", error);
      throw error;
    }
  }
  async function fetchGeneratedImg2VidContent(prompt_id: string) {
    try {
      // Fetch history data using axios
      const response = await axios.get(
        `http://localhost:8188/history/${prompt_id}`,
      );

      // Extract the specific history data
      const history = response.data[prompt_id];

      if (history) {
        // Extract the filename from the history data
        const filename = history.outputs[108].gifs[0].filename;

        // Construct the URL with the extracted filename
        const url = `http://localhost:8188/view?filename=${filename}&type=output`;

        return {
          url,
        };
      } else {
        throw new Error("History not found");
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      throw error;
    }
  }

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
                      {workflow === "workflow2"
                        ? "Upload Video:"
                        : "Upload Images:"}
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
        <div className="col-span-12 rounded-sm border border-stroke bg-white px-7.5 py-6 shadow-default dark:border-strokedark dark:bg-boxdark xl:col-span-12">
          <h4 className="mb-2 text-xl font-semibold text-black dark:text-white">
            Select Workflow:
          </h4>

          <div className="mb-5.5">
            <select
              className="w-full rounded border border-stroke bg-gray px-4.5 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
              name="workflow"
              id="workflow"
              value={workflow}
              onChange={(e) => setWorkflow(e.target.value)}
            >
              <option value="">Select Workflow</option>
              <option value="workflow1">Canvas Generator</option>
              <option value="workflow2">Video Upload</option>
              <option value="workflow3">Video Record</option>
            </select>
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
              Generate
            </button>
          </div>
        </div>
        <div className="col-span-12 h-full rounded-sm border border-stroke bg-white px-7.5 py-6 shadow-default dark:border-strokedark dark:bg-boxdark xl:col-span-12">
          <h4 className="mb-2 text-xl font-semibold text-black dark:text-white">
            Preview Video:
          </h4>
          <div className="flex justify-center">
            {generatedUrl ? (
              <video width={512} height={512} controls loop>
                <source src={generatedUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <Image
                width={400}
                height={400}
                src="/images/illustration/illustration-placeholder.svg"
                alt="placeholder"
                priority
              />
            )}
          </div>
        </div>
      </div>
    </form>
  );
};

export default FormOne;
