
let courses = [
  {name:"ENGR 233", color:"#ffffff", ID: "engr233", href: "detailsENGR233.html"},
  {name:"SOEN 287", color:"#ffffff", ID: "soen287", href: "detailsSOEN287.html"},
  {name:"SOEN 228", color:"#ffffff", ID: "soen228", href: "detailsSOEN228.html"},

  {name:"COMP 249", color:"#ffffff", ID: "comp249", href: "detailscomp249.html"}
];

let archived = []; /*array for archive courses*/ 

let selectedAssignment = null;

const container = document.getElementById("courseContainer");
const archivedContainer = document.getElementById("archivedContainer");

function createCard(course, isArchived=false){
  const card=document.createElement("div");
  card.className="card";
  card.style.background= "background: linear-gradient(135deg, #c4b0e8, #a8c4f5);";

  card.innerHTML=`
    <a href="${course.href}" class="card-header">
        <span>${course.name}</span>
    </a>
    <div class="card-header">
      <div class="card-buttons">
        ${isArchived 
          ? '<button class="unarchive">Unhide</button>' 
          : '<button class="remove">Remove</button><button class="archive">Hide</button>'}
      </div> 
    </div> 
    
  `; 

  
  

  if(isArchived){
    card.querySelector(".unarchive").onclick=()=>{
      courses.push(course);
      archived.splice(archived.indexOf(course),1);
      renderAll();
    };
  } else {
    card.querySelector(".archive").onclick=()=>{
      archived.push(course);
      courses.splice(courses.indexOf(course),1);
      renderAll(); 
    };

    card.querySelector(".remove").onclick=()=>{
      courses.splice(courses.indexOf(course),1);
      renderAll();
    };
  }

  return card;
}

function renderAll(){
  container.innerHTML="";
  archivedContainer.innerHTML="";
  courses.forEach(c=>container.appendChild(createCard(c,false)));
  archived.forEach(c=>archivedContainer.appendChild(createCard(c,true)));
}

renderAll();

document.getElementById("search").addEventListener("input",function(){
  const value=this.value.toLowerCase();
  container.innerHTML="";
  courses
    .filter(c=>c.name.toLowerCase().includes(value))
    .forEach(c=>container.appendChild(createCard(c,false)));
});

document.getElementById("sort").addEventListener("change", function(){
  if(this.value === "name"){ 
    container.innerHTML = "";

    const ul = document.createElement("ul");  // create a list
    ul.style.listStyle = "none";               // optional: remove bullets
    ul.style.padding = "0";
    ul.style.display = "flex";
    ul.style.flexDirection = "column";
    ul.style.gap = "10px";

    courses.forEach(c => {
      const li = document.createElement("li");
      
      li.style.background = "rgba(255,255,255,0.55)";
      li.style.padding = "12px 16px";
      li.style.borderRadius = "12px";
      li.style.border = "1px solid rgba(150,120,220,0.3)";


      const link = document.createElement("a");
    link.href = c.href;               // use the href from your course object
    link.textContent = c.name;        // course name
    link.style.textDecoration = "none";
    link.style.color = "#2d1b6e";
    link.style.fontWeight = "bold";


       li.appendChild(link); // add link inside li
      ul.appendChild(li);
    });

    container.appendChild(ul);
  } else {
    renderAll();
  }
});

document.getElementById("toggleArchived").onclick=()=>{
  archivedContainer.classList.toggle("hidden"); 
};

const calendarContainer = document.getElementById("calendarContainer");

const assignmentsData = [
  { title: "Assignment 1 - COMP249", dayOffset: 2 },
  { title: "Design Diagram", dayOffset: 4 }
];

function renderCalendar(view){
  calendarContainer.innerHTML="";
  const today=new Date();

  if(view==="today"){
    const div=createDay(today);
    calendarContainer.appendChild(div);
  }

  if(view==="week"){
    const week=document.createElement("div");
    week.className="calendar week";

    for(let i=0;i<7;i++){
      const date=new Date();
      date.setDate(today.getDate()-today.getDay()+i);
      week.appendChild(createDay(date));
    }

    calendarContainer.appendChild(week);
  }

  if(view==="month"){
    const month=document.createElement("div");
    month.className="calendar month";

    const days=new Date(today.getFullYear(), today.getMonth()+1,0).getDate();

    for(let i=1;i<=days;i++){
      const date=new Date(today.getFullYear(),today.getMonth(),i);
      month.appendChild(createDay(date));
    }

    calendarContainer.appendChild(month);
  }
}

function createDay(date){
  const day=document.createElement("div");
  day.className="day";

  if(date.toDateString()===new Date().toDateString()){
    day.classList.add("today");
  }

  day.innerHTML=`<h4>${date.toDateString()}</h4>`;

  assignmentsData.forEach(a=>{
    const assignmentDate=new Date();
    assignmentDate.setDate(assignmentDate.getDate()-assignmentDate.getDay()+a.dayOffset);

    if(date.toDateString()===assignmentDate.toDateString()){
      const assignment=document.createElement("div");
      assignment.className="assignment";
      assignment.textContent=a.title;
      day.appendChild(assignment);
    }
  });

  return day;
}

renderCalendar("today");

document.getElementById("calendarView").onchange=(e)=>{
  renderCalendar(e.target.value);
};

const modal=document.getElementById("modal");
const modalTitle=document.getElementById("modalTitle");

document.addEventListener("click",e=>{
  if(e.target.classList.contains("assignment")){
    selectedAssignment=e.target;
    modal.style.display="flex";
    modalTitle.textContent=e.target.textContent;
  }
});

function closeModal(){
  modal.style.display="none";
}

function markDone(){
  if(selectedAssignment){
    selectedAssignment.classList.add("done");
  }
  closeModal();
}



