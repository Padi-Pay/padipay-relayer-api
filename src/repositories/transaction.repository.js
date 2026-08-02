const createTransactionRepository = ({ prisma }) => {
  const findByHash = async (txHash) => prisma.transaction.findUnique({ where: { txHash } });
  const create = async (data) => prisma.transaction.create({ data });
  const updateStatus = async (txHash, status) => prisma.transaction.update({ where: { txHash }, data: { status } });
  
  return { findByHash, create, updateStatus };
};

module.exports = { createTransactionRepository };
