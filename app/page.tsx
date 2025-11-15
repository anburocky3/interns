import InternGrid from "@/components/InternGrid";
import internsData from "@/data/internsData";
import Image from "next/image";

export default function Home() {
  return (
    <div className="p-4">
      {/* Announcements */}
      {/* <div className="bg-yellow-200 text-center md:text-lg px-2 py-2 font-semibold mb-5 rounded text-black space-y-2">
        <p className="">
          🙋‍♂️ Hello viewers, we&apos;d like to inform you that there are
          currently #{internsData.length} individuals participating in the
          CyberDude Internships, (
          {internsData.filter((intern) => intern.gender === "M").length} males
          and {internsData.filter((intern) => intern.gender === "F").length}{" "}
          females.){" "}
        </p>
        <p className="text-sm text-yellow-800">
          If you happened to miss these opportunities you&apos;re welcome to{" "}
          <a
            href="https://www.youtube.com/playlist?list=PL73Obo20O_7grw9hv_lEO6iUPS6gc9ehh"
            target="_blank"
            className="text-orange-800 hover:text-orange-900"
          >
            watch the entire series here. 👈
          </a>
        </p>
      </div> */}

      <div className="px-2 py-4">
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 md:col-span-2  bg-neutral-800 rounded-lg p-4 text-center shadow-md h-fit ">
            <div className="">
              <h4 className="text-xl font-semibold text-white py-1 border border-gray-600 rounded shadow">
                Chief Mentor
              </h4>
            </div>
            <div className="flex flex-col items-center space-y-3 pt-6">
              <Image
                alt={"Anbuselvan Annamalai"}
                loading="lazy"
                width={80}
                height={80}
                className="w-48 shadow-lg rounded-full object-cover"
                src={"https://github.com/anburocky3.png"}
              />
              <div>
                <div className="font-semibold">Mr. Anbuselvan Annamalai</div>
                <div className="text-sm text-gray-600">Mentor/Project Head</div>
              </div>
            </div>
          </div>
          <div className="col-span-12 md:col-span-10">
            <InternGrid interns={internsData} />
          </div>
        </div>
      </div>
      <div className="text-center space-y-4 mt-5">
        <h4 className="text-xl">
          <a
            href="https://cyberdude-internship-tracker.vercel.app/"
            className="hover:underline"
            target="_blank"
          >
            View our past alumni interns
          </a>
        </h4>
        <p>
          Interested in hiring our interns? Contact us{" "}
          <a
            href="mailto:hr@cyberdude-networks.com"
            className="hover:text-blue-300"
          >
            here
          </a>
          .
        </p>
      </div>
    </div>
  );
}
