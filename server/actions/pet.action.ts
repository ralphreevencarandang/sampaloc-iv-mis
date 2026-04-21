"use server";

import prismaModule from "@/lib/prisma";
import {
  getPetFieldErrors,
  petSchema,
  type PetFormInput,
} from "@/validations/pet.validation";

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule;

type PetEntity = {
  id: string;
  ownerId: string;
  name: string;
  type: string;
  breed: string | null;
  color: string | null;
  vaccinationDate: Date | null;
  createdAt: Date;
  isArchive: boolean;
  owner: {
    firstName: string;
    middleName: string | null;
    lastName: string;
  };
};

export type PetRecord = {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  type: string;
  breed: string | null;
  color: string | null;
  vaccinationDate: string | null;
  createdAt: string;
  isArchive: boolean;
};

export type PetMutationResult = {
  success: boolean;
  message: string;
  pet?: PetRecord;
  fieldErrors?: Record<string, string>;
};

export type PetOwnerOption = {
  id: string;
  fullName: string;
};

function getFormValue(formData: FormData, key: keyof PetFormInput) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function mapPetRecord(pet: PetEntity): PetRecord {
  return {
    id: pet.id,
    ownerId: pet.ownerId,
    ownerName: [pet.owner.firstName, pet.owner.middleName, pet.owner.lastName]
      .filter(Boolean)
      .join(" "),
    name: pet.name,
    type: pet.type,
    breed: pet.breed,
    color: pet.color,
    vaccinationDate: pet.vaccinationDate?.toISOString() ?? null,
    createdAt: pet.createdAt.toISOString(),
    isArchive: pet.isArchive,
  };
}

async function validatePetOwner(ownerId: string) {
  return prisma.resident.findFirst({
    where: {
      id: ownerId,
      isArchived: false,
    },
    select: {
      id: true,
    },
  });
}

function parsePetForm(formData: FormData) {
  const parsed = petSchema.safeParse({
    ownerId: getFormValue(formData, "ownerId"),
    name: getFormValue(formData, "name"),
    type: getFormValue(formData, "type"),
    breed: getFormValue(formData, "breed"),
    color: getFormValue(formData, "color"),
    vaccinationDate: getFormValue(formData, "vaccinationDate"),
  });

  if (!parsed.success) {
    return {
      fieldErrors: getPetFieldErrors(parsed.error),
    };
  }

  return {
    data: parsed.data,
  };
}

export async function getPetOwnersForDropdown(): Promise<PetOwnerOption[]> {
  try {
    const residents = await prisma.resident.findMany({
      where: {
        isArchived: false,
      },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    return residents.map((resident) => ({
      id: resident.id,
      fullName: [resident.firstName, resident.middleName, resident.lastName]
        .filter(Boolean)
        .join(" "),
    }));
  } catch (error) {
    console.error("get pet owners failed", error);
    throw new Error("Failed to fetch pet owners.");
  }
}

export async function getPetsFromDb(options: {
  archived?: boolean;
  ownerId?: string;
} = {}): Promise<PetRecord[]> {
  const pets = await prisma.pet.findMany({
    where: {
      isArchive: options.archived ?? false,
      ...(options.ownerId ? { ownerId: options.ownerId } : {}),
    },
    include: {
      owner: {
        select: {
          firstName: true,
          middleName: true,
          lastName: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  return pets.map((pet) => mapPetRecord(pet as PetEntity));
}

export async function createPet(formData: FormData): Promise<PetMutationResult> {
  const { data, fieldErrors } = parsePetForm(formData);

  if (!data) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  try {
    const owner = await validatePetOwner(data.ownerId);

    if (!owner) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: {
          ownerId: "Select a valid resident owner.",
        },
      };
    }

    const createdPet = await prisma.pet.create({
      data: {
        ownerId: data.ownerId,
        name: data.name,
        type: data.type,
        breed: data.breed || null,
        color: data.color || null,
        vaccinationDate: data.vaccinationDate ? new Date(data.vaccinationDate) : null,
      },
      include: {
        owner: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      success: true,
      message: "Pet created successfully.",
      pet: mapPetRecord(createdPet as PetEntity),
    };
  } catch (error) {
    console.error("create pet failed", error);
    return {
      success: false,
      message: "An unexpected error occurred while creating the pet.",
    };
  }
}

export async function updatePet(id: string, formData: FormData): Promise<PetMutationResult> {
  const { data, fieldErrors } = parsePetForm(formData);

  if (!data) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  try {
    const existingPet = await prisma.pet.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingPet) {
      return {
        success: false,
        message: "Pet record not found.",
      };
    }

    const owner = await validatePetOwner(data.ownerId);

    if (!owner) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: {
          ownerId: "Select a valid resident owner.",
        },
      };
    }

    const updatedPet = await prisma.pet.update({
      where: { id },
      data: {
        ownerId: data.ownerId,
        name: data.name,
        type: data.type,
        breed: data.breed || null,
        color: data.color || null,
        vaccinationDate: data.vaccinationDate ? new Date(data.vaccinationDate) : null,
      },
      include: {
        owner: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      success: true,
      message: "Pet updated successfully.",
      pet: mapPetRecord(updatedPet as PetEntity),
    };
  } catch (error) {
    console.error("update pet failed", error);
    return {
      success: false,
      message: "An unexpected error occurred while updating the pet.",
    };
  }
}
