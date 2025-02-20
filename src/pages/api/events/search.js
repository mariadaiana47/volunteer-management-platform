import dbConnection from "@/lib/dbConnection";
import Event from "@/lib/models/event";

export default async function handler(req, res) {
  await dbConnection();

  try {
    const {
      category,
      searchText,
      minCredits,
      maxCredits,
      startDate,
      endDate,
      latitude,
      longitude,
      maxDistance,
    } = req.query;

    let query = {
      status: "active",
      date: { $gte: new Date() },
    };

    if (category) {
      query.category = category;
    }

    if (searchText) {
      query.$or = [
        { title: { $regex: searchText, $options: "i" } },
        { description: { $regex: searchText, $options: "i" } },
        { location: { $regex: searchText, $options: "i" } },
      ];
    }

    query.credits = {
      $gte: Number(minCredits) || 0,
      $lte: Number(maxCredits) || 1000,
    };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (latitude && longitude) {
      query.coordinates = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [Number(longitude), Number(latitude)],
          },
          $maxDistance: (Number(maxDistance) || 50) * 1000,
        },
      };
    }

    const events = await Event.find(query)
      .limit(50)
      .select("title description location coordinates category date credits");

    res.status(200).json({
      success: true,
      events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
