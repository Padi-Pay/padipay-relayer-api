const createWalletRepository = ({ prisma }) => {
  const findByUserId = async (userId) => prisma.wallet.findMany({ where: { userId } });
  const create = async (data) => prisma.wallet.create({ data });
  
  return { findByUserId, create };
};

module.exports = { createWalletRepository };
