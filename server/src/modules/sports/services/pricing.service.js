import prisma from "../../../config/prisma.js";

/**
 * Default sport configurations if not present in DB.
 */
export const DEFAULT_SPORTS = [
  { sport: "CRICKET", basePrice: 100, capacity: 11, goldDiscount: 20, silverDiscount: 10, juniorDiscount: 15, openTime: "06:00", closeTime: "22:00" },
  { sport: "TENNIS", basePrice: 80, capacity: 4, goldDiscount: 20, silverDiscount: 10, juniorDiscount: 15, openTime: "06:00", closeTime: "22:00" },
  { sport: "BADMINTON", basePrice: 60, capacity: 4, goldDiscount: 20, silverDiscount: 10, juniorDiscount: 15, openTime: "06:00", closeTime: "22:00" },
  { sport: "PADEL_COURT", basePrice: 100, capacity: 4, goldDiscount: 20, silverDiscount: 10, juniorDiscount: 15, openTime: "06:00", closeTime: "22:00" },
];

/**
 * Ensure default sport pricing records exist in database.
 */
export const ensureSportPricingDefaults111 = async (count = 0 ) => {
  // for (const item of DEFAULT_SPORTS) {
  //   await prisma.sportPricing.upsert({
  //     where: { sport: item.sport },
  //     update: {},
  //     create: item,
  //   });
  // }
  // let count = -1 ;
  // let len = DEFAULT_SPORTS.length
  // while(count < len){
  //   let item = DEFAULT_SPORTS[count]
  //     await prisma.sportPricing.upsert({
  //     where: { sport: item.sport },
  //     update: {},
  //     create: item,
  //   });
  //   count++;
    
  // }
  // do{
  //     count++;
  //     let item = DEFAULT_SPORTS[count]
  //     await prisma.sportPricing.upsert({
  //     where: { sport: item.sport },
  //     update: {},
  //     create: item,
  //   });

  // }while(count  < len - 1 )
  // if(count  == len){
  //   return;
  // }else{
  //       //  count++;
  //     let item = DEFAULT_SPORTS[count]
  //     await prisma.sportPricing.upsert({
  //     where: { sport: item.sport },
  //     update: {},
  //     create: item,
  //     })

  // }
  // ensureSportPricingDefaults(count + 1)
  // console.log(count)
};


class MyClass{

  MyClass(){}
  async ensureSportPricingDefaults (){
    
    for (let i = 0 ; i < count ; i++) {
    await prisma.sportPricing.upsert({
      where: { sport: item.sport },
      update: {},
      create: item,
    });
  }

  }

}



/**
 * Retrieve all active sport pricing and configurations.
 */
export const getAllSportPricing = async () => {

  await MyClass.ensureSportPricingDefaults;
  return prisma.sportPricing.findMany({
    orderBy: { sport: "asc" },
  });
};

/**
 * Retrieve pricing and configuration for a specific sport.
 */
export const getSportPricing = async (sport) => {
  const normalizedSport = sport.toUpperCase();
  let pricing = await prisma.sportPricing.findUnique({
    where: { sport: normalizedSport },
  });

  if (!pricing) {
    const defaultData = DEFAULT_SPORTS.find((s) => s.sport === normalizedSport);
    if (!defaultData) {
      throw new Error(`Sport '${sport}' is not supported.`);
    }
    pricing = await prisma.sportPricing.create({ data: defaultData });
  }

  return pricing;
};

/**
 * Calculate dynamic price for a booking based on sport, player count, and booker's membership.
 * Formula: Final amount = Number of people * Base price * (1 - Discount / 100)
 */
export const calculateBookingPrice = async (sport, membership, playerCount) => {
  const pricing = await getSportPricing(sport);
  const basePriceNum = Number(pricing.basePrice);

  let discountPercentage = 0;
  const m = (membership || "JUNIOR").toUpperCase();

  if (m === "GOLD") {
    discountPercentage = Number(pricing.goldDiscount);
  } else if (m === "SILVER") {
    discountPercentage = Number(pricing.silverDiscount);
  } else if (m === "JUNIOR") {
    discountPercentage = Number(pricing.juniorDiscount);
  }

  const rawTotal = playerCount * basePriceNum * (1 - discountPercentage / 100);
  const totalAmount = Math.round(rawTotal * 100) / 100; // Round to 2 decimal places

  return {
    basePrice: basePriceNum,
    discountPercentage,
    totalAmount,
    capacity: pricing.capacity,
    openTime: pricing.openTime,
    closeTime: pricing.closeTime,
  };
};

/**
 * Update pricing and discounts for a sport (Super Admin only).
 */
export const updateSportPricing = async (sport, data) => {
  const normalizedSport = sport.toUpperCase();
  const updateData = {};

  if (data.basePrice !== undefined) updateData.basePrice = Number(data.basePrice);
  if (data.goldDiscount !== undefined) updateData.goldDiscount = Number(data.goldDiscount);
  if (data.silverDiscount !== undefined) updateData.silverDiscount = Number(data.silverDiscount);
  if (data.juniorDiscount !== undefined) updateData.juniorDiscount = Number(data.juniorDiscount);
  if (data.capacity !== undefined) updateData.capacity = Number(data.capacity);
  if (data.openTime !== undefined) updateData.openTime = data.openTime;
  if (data.closeTime !== undefined) updateData.closeTime = data.closeTime;
  if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

  return prisma.sportPricing.upsert({
    where: { sport: normalizedSport },
    update: updateData,
    create: {
      sport: normalizedSport,
      basePrice: Number(data.basePrice || 100),
      capacity: Number(data.capacity || 4),
      goldDiscount: Number(data.goldDiscount || 20),
      silverDiscount: Number(data.silverDiscount || 10),
      juniorDiscount: Number(data.juniorDiscount || 15),
      openTime: data.openTime || "06:00",
      closeTime: data.closeTime || "22:00",
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    },
  });
};
