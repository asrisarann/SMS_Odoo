import prisma from "../../../config/prisma.js";

/**
 * Registers a walk-in visitor using the existing User model.
 *
 * Case A: If user with the phone number already exists:
 *         - Updates lastEntry to the current timestamp.
 *         - Does not overwrite membership or other profile details.
 *         - Returns existing user (isNew: false).
 *
 * Case B: If new user:
 *         - Checks for unique email conflicts (returns 409 if taken).
 *         - Creates a new User with name, phone, email, membership, lastEntry.
 *         - Returns newly created user (isNew: true).
 *
 * Uses a Prisma transaction for safe atomic database operations.
 */
export const registerWalkinUser = async ({ name, phone, email, membership }) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Search existing user by phone number
    const existingUserByPhone = await tx.user.findUnique({
      where: { phone },
    });

    if (existingUserByPhone) {
      // Case A: Existing user found - update lastEntry
      const updatedUser = await tx.user.update({
        where: { id: existingUserByPhone.id },
        data: {
          lastEntry: new Date(),
        },
      });

      return {
        user: updatedUser,
        isNew: false,
        message: "Existing user found. Check-in timestamp updated.",
      };
    }

    // 2. Pre-check if email is already taken by another user
    const existingUserByEmail = await tx.user.findUnique({
      where: { email },
    });

    if (existingUserByEmail) {
      const error = new Error("A user with this email address already exists.");
      error.statusCode = 409;
      error.field = "email";
      throw error;
    }

    // 3. Case B: Create new user record
    const newUser = await tx.user.create({
      data: {
        name,
        phone,
        email,
        membership,
        lastEntry: new Date(),
      },
    });

    return {
      user: newUser,
      isNew: true,
      message: "New walk-in visitor registered successfully.",
    };
  });
};
