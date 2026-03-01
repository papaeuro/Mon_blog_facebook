import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ThumbsUp, 
  MessageSquare, 
  Share2, 
  Image as ImageIcon, 
  Link as LinkIcon,
  Sparkles,
  X,
  Download,
  Search,
  MoreHorizontal
} from 'lucide-react';

// --- TES CONFIGURATIONS FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCNqWGbj3Tac8OU7qXHTy8E0eE0xTg2tkQ",
  authDomain: "mon-blog-5b2c2.firebaseapp.com",
  projectId: "mon-blog-5b2c2",
  storageBucket: "mon-blog-5b2c2.firebasestorage.app",
  messagingSenderId: "420647912582",
  appId: "1:420647912582:web:a012b3e6f9c3588ade7d07"
};

// Initialisation des services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "mon-blog-5b2c2"; // Ton identifiant de projet

// --- FONCTION IA GEMINI ---
const geminiApiKey = ""; // Gérée par l'environnement

const callGemini = async (prompt) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiApiKey}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: "Tu es un assistant expert en réseaux sociaux. Réponds de façon courte et engageante en français." }] }
      })
    });
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "L'IA est prête.";
  } catch (e) { 
    return "Petit souci avec l'IA, réessaie plus tard."; 
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Authentification anonyme obligatoire pour Firestore
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Erreur d'authentification:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Lecture des publications en temps réel (Chemin structuré)
  useEffect(() => {
    if (!user) return;
    
    // Utilisation du chemin recommandé pour éviter les erreurs de permissions
    const postsRef = collection(db, 'artifacts', appId, 'public', 'data', 'posts');
    
    const unsubscribe = onSnapshot(postsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Tri manuel par date
      setPosts(data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
    }, (err) => {
      console.error("Erreur Firestore:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // Publier un nouveau message
  const handlePost = async (e) => {
    e.preventDefault();
    if (!content || !user) return;
    setIsSubmitting(true);
    try {
      const postsRef = collection(db, 'artifacts', appId, 'public', 'data', 'posts');
      await addDoc(postsRef, {
        content,
        mediaUrl,
        authorName: "Utilisateur",
        authorId: user.uid,
        authorPhoto: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        createdAt: serverTimestamp(),
        likes: 0
      });
      setContent("");
      setMediaUrl("");
      setShowModal(false);
    } catch (err) { 
      console.error("Erreur lors de l'envoi:", err);
    }
    setIsSubmitting(false);
  };

  const generateWithAI = async () => {
    if (!content) return;
    setIsGenerating(true);
    const res = await callGemini(`Réécris ce texte pour qu'il soit plus viral et attractif sur un réseau social : "${content}"`);
    setContent(res);
    setIsGenerating(false);
  };

  const isImage = (url) => url && (url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null);

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-[#1C1E21] font-sans pb-10">
      {/* Barre de navigation style Facebook */}
      <nav className="bg-white shadow-sm sticky top-0 z-50 h-14 flex items-center px-4 justify-between border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Share2 className="text-white w-6 h-6" />
          </div>
          <div className="bg-[#F0F2F5] flex items-center px-3 py-2 rounded-full md:w-64">
            <Search className="text-gray-500 w-4 h-4 mr-2" />
            <input type="text" placeholder="Rechercher sur le fil..." className="bg-transparent text-sm outline-none w-full" />
          </div>
        </div>
        <div className="flex gap-2">
           {user && <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className="w-10 h-10 rounded-full border border-gray-200" alt="Moi" />}
        </div>
      </nav>

      <div className="max-w-[600px] mx-auto mt-6 px-4">
        {/* Zone de création de post */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-5 border border-gray-200">
          <div className="flex gap-3 mb-4">
            <img src={user ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}` : ""} className="w-10 h-10 rounded-full bg-gray-100" alt="" />
            <button 
              onClick={() => setShowModal(true)}
              className="bg-[#F0F2F5] hover:bg-[#E4E6E9] transition-colors flex-1 rounded-full px-4 py-2 text-left text-gray-500 text-[17px]"
            >
              Exprime-toi ou partage un fichier...
            </button>
          </div>
          <div className="border-t pt-2 flex justify-around">
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 hover:bg-gray-100 flex-1 justify-center py-2 rounded-lg transition-colors text-gray-600 font-semibold text-sm">
              <ImageIcon className="text-green-500 w-5 h-5" /> Image/Fichier
            </button>
            <button onClick={generateWithAI} className="flex items-center gap-2 hover:bg-gray-100 flex-1 justify-center py-2 rounded-lg transition-colors text-purple-600 font-semibold text-sm">
              <Sparkles className="w-5 h-5" /> Booster avec l'IA
            </button>
          </div>
        </div>

        {/* Fil des publications */}
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
              {/* Entête */}
              <div className="p-4 flex justify-between items-start">
                <div className="flex gap-3">
                  <img src={post.authorPhoto} className="w-10 h-10 rounded-full border bg-gray-50" alt="" />
                  <div>
                    <h4 className="font-bold text-[15px] hover:underline cursor-pointer">{post.authorName}</h4>
                    <p className="text-xs text-gray-500">
                      {post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleString() : 'En ligne'}
                    </p>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-full">
                  <MoreHorizontal className="text-gray-500 w-5 h-5" />
                </button>
              </div>

              {/* Texte */}
              <div className="px-4 pb-3">
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>
              </div>

              {/* Média */}
              {post.mediaUrl && (
                <div className="bg-gray-100 border-y border-gray-50 flex justify-center items-center overflow-hidden">
                  {isImage(post.mediaUrl) ? (
                    <img src={post.mediaUrl} className="w-full h-auto max-h-[500px] object-contain" alt="Publication" />
                  ) : (
                    <div className="p-10 flex flex-col items-center gap-3 w-full bg-blue-50 text-blue-600">
                      <Download className="w-10 h-10" />
                      <a href={post.mediaUrl} target="_blank" rel="noreferrer" className="font-bold underline">Télécharger le fichier partagé</a>
                    </div>
                  )}
                </div>
              )}

              {/* Interactions */}
              <div className="px-4 py-1">
                <div className="flex justify-between text-gray-500 text-sm border-b py-2 font-medium">
                  <div className="flex items-center gap-1">
                    <div className="bg-blue-500 p-0.5 rounded-full"><ThumbsUp className="text-white w-2.5 h-2.5 fill-white" /></div>
                    <span>{post.likes || 0}</span>
                  </div>
                  <div>0 commentaires</div>
                </div>
                <div className="flex justify-around py-1">
                  <button className="flex items-center gap-2 hover:bg-gray-100 flex-1 justify-center py-2 rounded-lg text-gray-600 font-semibold text-sm">
                    <ThumbsUp className="w-5 h-5" /> J'aime
                  </button>
                  <button className="flex items-center gap-2 hover:bg-gray-100 flex-1 justify-center py-2 rounded-lg text-gray-600 font-semibold text-sm">
                    <MessageSquare className="w-5 h-5" /> Commenter
                  </button>
                  <button className="flex items-center gap-2 hover:bg-gray-100 flex-1 justify-center py-2 rounded-lg text-gray-600 font-semibold text-sm">
                    <Share2 className="w-5 h-5" /> Partager
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de création */}
      {showModal && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[500px] rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in zoom-in duration-200">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div className="w-8"></div>
              <h3 className="font-bold text-lg">Nouvelle publication</h3>
              <button onClick={() => setShowModal(false)} className="bg-gray-200 p-1.5 rounded-full hover:bg-gray-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePost} className="p-4">
              <textarea 
                className="w-full text-lg outline-none min-h-[150px] resize-none placeholder:text-gray-400"
                placeholder="Partagez quelque chose avec la communauté..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="border rounded-lg p-3 mb-4 space-y-3 bg-gray-50">
                <div className="flex items-center gap-2">
                  <LinkIcon className="text-blue-500 w-5 h-5" />
                  <input 
                    type="url" 
                    placeholder="Lien de l'image ou du fichier (Google Drive, Imgur...)"
                    className="flex-1 bg-transparent outline-none text-sm"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button" onClick={generateWithAI} disabled={isGenerating}
                  className="flex-1 border border-purple-300 text-purple-600 font-bold py-2.5 rounded-lg hover:bg-purple-50 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                   {isGenerating ? "IA..." : <><Sparkles className="w-4 h-4" /> IA Booster</>}
                </button>
                <button 
                  type="submit" disabled={isSubmitting || !content}
                  className="flex-[2] bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 text-sm"
                >
                  {isSubmitting ? "Envoi..." : "Publier maintenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
