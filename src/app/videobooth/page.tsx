import WebCam from "@/components/WebCam";
import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

export const metadata: Metadata = {
  title: "Video Booth | WeSmile",
};

const CalendarPage = () => {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="AI Video Recorder" />
      <WebCam />
    </DefaultLayout>
  );
};

export default CalendarPage;
