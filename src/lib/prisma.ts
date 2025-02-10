import { PrismaClient } from "@prisma/client";

const prisma = (() => {
  let prismaClient: PrismaClient | null = null;

  return (): PrismaClient => {
    if (!prismaClient) {
      prismaClient = new PrismaClient();
    }
    return prismaClient;
  };
})();

export default prisma();
