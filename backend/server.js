const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const gradesRouter = require('./routes/grades');
app.use('/api/grades', gradesRouter);

const adminCoursesRoutes = require('./routes/adminCourses');
console.log('✅ registering adminCourses routes');
app.use('/api', adminCoursesRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});