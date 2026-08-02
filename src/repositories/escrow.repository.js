const createEscrowRepository = ({ prisma }) => {
  const findById = async (id) => prisma.escrowIntent.findUnique({ where: { id } });
  
  const create = async (data) => prisma.escrowIntent.create({ data });
  
  const updateStatus = async (id, status, onChainEscrowId = null) => {
    const data = { status };
    if (onChainEscrowId) data.onChainEscrowId = onChainEscrowId;
    return prisma.escrowIntent.update({ where: { id }, data });
  };
  
  return { findById, create, updateStatus };
};

module.exports = { createEscrowRepository };
