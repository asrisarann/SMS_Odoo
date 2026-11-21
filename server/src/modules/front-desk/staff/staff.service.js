import prisma from "../../../config/prisma.js";

/**
 * Retrieves all staff members.
 *
 * @returns {Promise<Array>}
 */
export const getAllStaff = async () => {
  return await prisma.staff.findMany({
    orderBy: {
      name: "asc",
    },
  });
};

/**
 * Retrieves a single staff member by ID.
 *
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export const getStaffById = async (id) => {
  return await prisma.staff.findUnique({
    where: { id },
    include: {
      schedules: true,
    },
  });
};
