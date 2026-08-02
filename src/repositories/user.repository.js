const createUserRepository = ({ prisma }) => {
  const findById = async (id) => prisma.user.findUnique({ where: { id } });
  const findByEmail = async (email) => prisma.user.findUnique({ where: { email } });
  const create = async (data) => prisma.user.create({ data });
  
  return { findById, findByEmail, create };
};

module.exports = { createUserRepository };
