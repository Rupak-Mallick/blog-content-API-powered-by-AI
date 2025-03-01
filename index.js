require('dotenv').config(); // .env ফাইল থেকে API Key লোড করা
const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // HTTP রিকোয়েস্টের জন্য

const app = express();
const PORT = 3000;

app.use(express.json());

const filePath = path.join(__dirname, 'posts.json');
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY; // Google Gemini API Key

if (!GOOGLE_API_KEY) {
  console.error("❌ Error: Google API Key is missing in the .env file!");
  process.exit(1);
}

// ✅ JSON ফাইল থেকে ডাটা পড়ার ফাংশন
const readData = () => {
  if (!fs.existsSync(filePath)) return [];
  const data = fs.readFileSync(filePath, 'utf8');
  return data ? JSON.parse(data) : [];
};

// ✅ JSON ফাইলে ডাটা লেখার ফাংশন
const writeData = (data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// ✅ Google Gemini API কল করার ফাংশন
const generateBlog = async (title, content, author) => {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GOOGLE_API_KEY}`,
      {
        contents: [
          { role: 'user', parts: [{ text: `Write a detailed blog on: ${title}.\nDetails: ${content}.\nAuthor:${author}` }] }
        ]
      }
    );

    return response.data.candidates[0].content.parts[0].text; // Google Gemini থেকে ব্লগ টেক্সট ফেরত আসবে
  } catch (error) {
    console.error('❌ Error generating blog:', error.response?.data || error.message);
    return null;
  }
};

// ✅ নতুন ব্লগ তৈরির API (Google Gemini সহ)

//author কে অন্য কোনো API থেকে ফেচ করতে
const fetchAuthor = async () => {
    try {
      const response = await axios.get('https://randomuser.me/api/');
      const user = response.data.results[0];
      return `${user.name.first} ${user.name.last}`; // র্যান্ডম author নাম
    } catch (error) {
      console.error("❌ Error fetching author:", error.message);
      return "Unknown Author"; // fallback value
    }
  }; 

app.post('/posts/create', async (req, res) => {
  const posts = readData();
  const { title, content} = req.body;

  if (!title || !content ) {
    return res.status(400).json({ message: 'Title এবং content আবশ্যক' });
  }

  // Random author fetch করা
  const author = await fetchAuthor();


  // Google Gemini API-তে রিকোয়েস্ট পাঠিয়ে ব্লগ কনটেন্ট তৈরি করা
  const generatedBlog = await generateBlog(title, content, author);

  if (!generatedBlog) {
    return res.status(500).json({ message: 'Blog generation failed' });
  }

  const newPost = {
    id: posts.length ? posts[posts.length - 1].id + 1 : 1,
    title,
    content: generatedBlog, // Google Gemini থেকে পাওয়া ব্লগ
    author,
    date: new Date().toISOString()
  };

  posts.push(newPost);
  writeData(posts);

  res.status(201).json(newPost);
});

//পোস্ট ডিলিট করার API (DELETE /posts/:id)

app.delete('/posts/:id', (req, res) => {
  let posts = readData();
  const newPosts = posts.filter(p => p.id !== parseInt(req.params.id)); // ID বাদ দেওয়া

  if (newPosts.length === posts.length) return res.status(404).json({ message: 'পোস্ট পাওয়া যায়নি' });

  writeData(newPosts);
  res.json({ message: 'পোস্ট সফলভাবে ডিলিট করা হয়েছে' });
});

// ✅ সার্ভার চালু করা
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
