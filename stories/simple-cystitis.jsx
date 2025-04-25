import React, { useState } from 'react';

// Case 1: Simple Cystitis in a Young Woman
const casesData = [
  {
    id: 1,
    title: '🎉 Case 1: Simple Cystitis in a Young Woman',
    nodes: {
      start: {
        prompt: `Our 25-year-old heroine presents with dysuria, urgency, and frequency—her bladder is staging a protest! UA shows pyuria and nitrites. Time to suit up with your antibiotic cape: which empiric therapy do you choose?`,
        choices: [
          {
            id: 'A1', text: '🌟 TMP-SMX (Bactrim/Septra)', score: 0, next: 'treatmentResponse',
            feedback: 'Not recommended empirically in regions where TMP-SMX resistance >20%; reserve for targeted therapy after culture.',
            details: { family: 'Folate synthesis inhibitor', spectrum: ['E. coli','Klebsiella spp.','Proteus spp.'], pk: '≈90% oral bioavailability', se: ['Rash','Hyperkalemia','Bone marrow suppression'] }
          },
          {
            id: 'A2', text: '🦸 Nitrofurantoin (Macrodantin)', score: 10, next: 'cultureResults',
            feedback: 'Excellent first-line choice! Concentrates in urine—perfect for cystitis only.',
            details: { family: 'Nitrofuran', spectrum: ['E. coli','S. saprophyticus','Enterococcus faecalis'], pk: 'Good oral absorption; urine concentration', se: ['Pulmonary fibrosis','GI upset','Hemolytic anemia'] }
          },
          {
            id: 'A3', text: '✨ Fosfomycin (Monurol)', score: 10, next: 'cultureResults',
            feedback: 'One dose wonder—mic drop in pharmacology! Bladder only, no kidney penetration.',
            details: { family: 'Phosphonic acid derivative', spectrum: ['E. coli (ESBL)','Enterococcus faecalis'], pk: '37–58% bioavailability; excreted unchanged', se: ['Diarrhea','Headache','Nausea'] }
          },
          {
            id: 'A4', text: '🚫 Ciprofloxacin (Cipro)', score: 5, next: 'treatmentResponse',
            feedback: `Whoa there! your antibiotic stewardship senior just screamed, ‘Are you crazy?! No fluoroquinolones for simple cystitis—FDA warning in effect! Do you want her Achilles tendon to snap?’`,
            details: { family: 'Fluoroquinolone', spectrum: ['Gram-negative rods incl. Pseudomonas'], pk: '70–80% oral bioavailability; hepatic metabolism', se: ['Tendon rupture','QT prolongation','GI upset'] }
          }
        ]
      },
      treatmentResponse: {
        prompt: '',
        choices: [
          { id: 'back', text: '🔄 Try Again', action: 'back' },
          { id: 'next', text: '➡️ Continue', action: 'forward' }
        ]
      },
      cultureResults: {
        prompt: `The urine culture grows Escherichia coli (the usual party crasher). It’s sensitive to everything except ampicillin. Our patient’s bladder peace treaty is signed! 🎉`,
        choices: [ { id: 'toQuiz', text: '➡️ Proceed to Quiz', action: 'forward' } ]
      },
      quiz: {
        choices: [
          { id: 'Q1', question: '1. First-line empiric therapy for uncomplicated cystitis?', options: ['Nitrofurantoin','TMP-SMX','Ciprofloxacin'], correct: 'Nitrofurantoin' },
          { id: 'Q2', question: '2. Which organism is NOT covered by nitrofurantoin?', options: ['E. coli','Pseudomonas','Enterococcus'], correct: 'Pseudomonas' },
          { id: 'Q3', question: '3. Major side effect of fluoroquinolones?', options: ['Tendon rupture','Hepatotoxicity','Nephrotoxicity'], correct: 'Tendon rupture' }
        ]
      },
      summary: {
        points: [
          'Nitrofurantoin & fosfomycin are first-line empiric therapies for uncomplicated cystitis.',
          'Avoid TMP-SMX empirically if resistance >20%.',
          'Fluoroquinolones carry an FDA tendon rupture warning; reserve for when truly needed.',
          'Always tailor therapy based on culture & sensitivity results.'
        ]
      }
    }
  }
];

export default function ChooseYourPathApp() {
  const [nodeId, setNodeId] = useState('start');
  const [prevId, setPrevId] = useState(null);
  const [choice, setChoice] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const cs = casesData[0];
  const node = cs.nodes[nodeId];

  const handleChoice = c => { setPrevId(nodeId); setChoice(c); setNodeId('treatmentResponse'); };
  const handleFeedback = action => { setNodeId(action === 'back' ? prevId : choice.next); setChoice(null); };
  const toggleDetails = id => setDetailsOpen(d => (d === id ? null : id));
  const selectAnswer = (qid,opt) => setAnswers(a => ({ ...a, [qid]:opt }));
  const submitQuiz = () => { let score=0; cs.nodes.quiz.choices.forEach(q=>{ if(answers[q.id]===q.correct) score++; }); setResult({score,total:cs.nodes.quiz.choices.length}); };

  if(nodeId==='start') return (
    <div className="p-6 mx-auto max-w-xl bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl shadow">
      <h2 className="text-2xl font-bold text-center text-purple-700 mb-4">{cs.title}</h2>
      <p className="mb-4">{node.prompt}</p>
      {node.choices.map((c,i)=>(
        <div key={c.id} className="mb-3 border rounded-lg overflow-hidden">
          <div className="flex items-center">
            <button onClick={()=>handleChoice(c)} className={`flex-1 text-left px-4 py-3 ${['bg-green-100','bg-indigo-100','bg-pink-100','bg-yellow-100'][i]} hover:${['bg-green-200','bg-indigo-200','bg-pink-200','bg-yellow-200'][i]}`}>{c.text}</button>
            <button onClick={()=>toggleDetails(c.id)} className="ml-2 px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded-full text-sm">ℹ️ Details</button>
          </div>
          {detailsOpen===c.id && <div className="p-3 bg-gray-50 text-sm"><p><strong>Family</strong>: {c.details.family}</p><p><strong>Spectrum</strong>: {c.details.spectrum.join(', ')}</p><p><strong>PK</strong>: {c.details.pk}</p><p><strong>SE</strong>: {c.details.se.join(', ')}</p></div>}
        </div>
      ))}
    </div>
  );

  if(nodeId==='treatmentResponse') return (
    <div className="p-6 mx-auto max-w-xl bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl shadow">
      <h2 className="text-xl font-bold text-center text-purple-700 mb-4">💬 Feedback</h2>
      <p className="italic mb-4">{choice.feedback}</p>
      <div className="flex justify-center space-x-4">
        {['A1','A4'].includes(choice.id) && <button onClick={()=>handleFeedback('back')} className="px-5 py-3 bg-red-100 rounded-lg">🔄 Try Again</button>}
        {['A2','A3'].includes(choice.id) && <button onClick={()=>handleFeedback('forward')} className="px-5 py-3 bg-green-100 rounded-lg">➡️ Continue</button>}
      </div>
    </div>
  );

  if(nodeId==='cultureResults') return (
    <div className="p-6 mx-auto max-w-xl bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl shadow">
      <h2 className="text-xl font-bold mb-4 text-center text-purple-700">🧫 Culture Results</h2>
      <p className="mb-4">{node.prompt}</p>
      <button onClick={()=>setNodeId('quiz')} className="px-5 py-3 bg-blue-100 rounded-lg">➡️ Proceed to Quiz</button>
    </div>
  );

  if(nodeId==='quiz') return (
    <div className="p-6 mx-auto max-w-xl bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl shadow">
      <h2 className="text-xl font-bold text-center text-purple-700 mb-4">📝 Quiz</h2>
      {cs.nodes.quiz.choices.map(q=>(
        <div key={q.id} className="mb-4">
          <p className="mb-2 font-semibold">{q.question}</p>
          <div className="flex space-x-4">
            {q.options.map(opt=><button key={opt} onClick={()=>selectAnswer(q.id,opt)} className={`px-3 py-1 border rounded ${answers[q.id]===opt?'bg-green-200':''}`}>{opt}</button>)}
          </div>
          {result && <p className={`${answers[q.id]===q.correct?'text-green-600':'text-red-600'} mt-2`}>{answers[q.id]===q.correct?'✅ Correct':`❌ Wrong (Correct: ${q.correct})`}</p>}
        </div>
      ))}
      {!result ? <button onClick={submitQuiz} className="px-5 py-3 bg-blue-100 rounded-lg">Submit</button>
                : <button onClick={()=>setNodeId('summary')} className="px-5 py-3 bg-green-100 rounded-lg">➡️ Summary</button>}
    </div>
  );

  if(nodeId==='summary') return (
    <div className="p-6 mx-auto max-w-xl bg-green-50 rounded-2xl shadow">
      <h2 className="text-xl font-bold text-center text-purple-700 mb-4">📝 Summary</h2>
      <ul className="list-disc list-inside space-y-2">
        {cs.nodes.summary.points.map((pt,idx)=><li key={idx}>{pt}</li>)}
      </ul>
      
    </div>
  );

  return null;
}
