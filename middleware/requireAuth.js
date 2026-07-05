const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized. Please login.' });
  }
  next();
};

module.exports = requireAuth;
