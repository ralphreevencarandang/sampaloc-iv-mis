import prismaModule from "@/lib/prisma";

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule;

type AnnouncementEntity = {
  id: string;
  title: string;
  content: string;
  image: string | null;
  createdAt: Date;
  createdById: string;
  createdBy: {
    firstName: string;
    lastName: string;
    position: string;
  };
};

export type AnnouncementRecord = {
  id: string;
  title: string;
  content: string;
  image: string | null;
  createdAt: string;
  createdById: string;
  createdBy: {
    firstName: string;
    lastName: string;
    position: string;
  };
};

export function mapAnnouncementRecord(announcement: AnnouncementEntity): AnnouncementRecord {
  return {
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    image: announcement.image ?? null,
    createdAt: announcement.createdAt.toISOString(),
    createdById: announcement.createdById,
    createdBy: {
      firstName: announcement.createdBy.firstName,
      lastName: announcement.createdBy.lastName,
      position: announcement.createdBy.position,
    },
  };
}

export async function fetchAnnouncementsFromDb(): Promise<AnnouncementRecord[]> {
  const announcements = await prisma.announcement.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      title: true,
      content: true,
      image: true,
      createdAt: true,
      createdById: true,
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
          position: true,
        },
      },
    },
  });

  return announcements.map(mapAnnouncementRecord);
}
