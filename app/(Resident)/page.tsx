import Image from "next/image";
import ResidentHero from "@/components/sections/ResidentHero";
import ResidentNavbar from "@/components/ui/ResidentNavbar";
import ResidentAnnouncement from "@/components/sections/ResidentAnnouncement";
import ResidentOfficials from "@/components/sections/ResidentOfficials";
import ResidentAboutUs from "@/components/sections/ResidentAboutUs";
import ResidentServices from "@/components/sections/ResidentServices";
import ResidentContactUs from "@/components/sections/ResidentContactUs";
import ResidentFooter from "@/components/ui/ResidentFooter";
export default function Home() {
  return (
    <section>
      <ResidentNavbar />
      <ResidentHero/>
      <ResidentAnnouncement />
      <ResidentOfficials />
      <ResidentAboutUs />
      <ResidentServices />
      <ResidentContactUs />
      <ResidentFooter />


    </section>
  );
}
