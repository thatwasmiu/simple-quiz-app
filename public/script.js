// get question right from start or reload
getQuestionList();

// global variable
const header = document.querySelector("header");
const section = document.querySelectorAll("section")
const btns = document.querySelectorAll("button");
const attemptQuestionList = document.querySelector(".attempt-question-list");
const reviewQuestionList = document.querySelector(".review-question-list");
let userAnswers = {};
let routeParam;
for (const btn of btns) btn.addEventListener('click', onButtonEvent);

// fetch API then set route param and and send data to populate questions to screen 1 & 2
async function getQuestionList() {
    
    const response = await fetch('http://localhost:3000/attempts',{method : 'POST',});
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    
    const data =  await response.json();
    if (typeof data !== 'object') throw new Error(`Err: ${data}`);

    userAnswers = new Object();
    routeParam = data._id;
    populateQuiz(data.questions);
}

// for each question in question list create an element containt the question data and append to the screen 1 & 2
function populateQuiz(questionList) {
    for (const index in questionList) {
        const question = createQuestion(index, questionList[index]);
        attemptQuestionList.appendChild(question);
    }
    reviewQuestionList.innerHTML = `${attemptQuestionList.innerHTML}`;
           
}

// create question element from sent data
function createQuestion(index, content) {
    const question = document.createElement("div")
    question.className = content._id;

    const questionIndex = document.createElement("h4");
    questionIndex.classList.add("question-index");
    questionIndex.textContent = `Question ${Number(index)+1} of 10`;

    const questionText = document.createElement("p");
    questionText.classList.add("question-text");
    questionText.textContent = content.text;

    question.appendChild(questionIndex);
    question.appendChild(questionText);
    let qIndex = 0;
    for (const a of content.answers) {
        const answerText = document.createElement("span");
        answerText.textContent = a;

        const label = document.createElement("div");
        label.classList.add("option");
        label.innerHTML = `<input type="radio" value="${qIndex++}">`;
        label.appendChild(answerText);
        label.addEventListener('click', selectOption);

        question.appendChild(label);
    }
    return question;
}

// button even handler, each type of button trigger different type of action
function onButtonEvent(e) {
    if (e.currentTarget.id === "btn-start") {
        changeScreen(section[1], section[2]);
    }
    else if (e.currentTarget.id === "btn-submit") { 
        if(confirm("Are you sure want to finish this quiz?") === true) {
            sendUserAnswers();      
        } 
    }       
    else {
        attemptQuestionList.innerHTML = ""; 
        getQuestionList();
        changeScreen(section[3], section[1]);
    }   
}

// hide current screen and show next screen
function changeScreen(hiddenSec, shownSec) {
    hiddenSec.classList.add("hidden");
    shownSec.classList.remove("hidden");
    header.scrollIntoView();
}

// highlight the selected option and unselect previously-chosen option
function selectOption(e) {
    const selectedOption = e.currentTarget;
    const radioBtn = selectedOption.querySelector("input");

    const parentElement = selectedOption.parentElement;
    const questionId = parentElement.className;
    const reviewQuestion = reviewQuestionList.querySelector(`[class="${questionId}"]`); 
    
    const childElement = parentElement.querySelector(".option-selected");
    if (childElement) {
        childElement.classList.remove("option-selected");
        childElement.querySelector("input").removeAttribute("checked"); 
    }

    selectedOption.classList.add("option-selected"); 
    radioBtn.setAttribute("checked", "");

    userAnswers[`${questionId}`] = `${radioBtn.value}`;
    reviewQuestion.innerHTML = `${parentElement.innerHTML}`;
}

// send request to API using fetch and get correct answer and score
async function sendUserAnswers() {
    const userData = {
        userAnswers : userAnswers, 
    };

    const response = await fetch(`http://localhost:3000/attempts/${routeParam}/submit`, {
        method : 'POST',
        headers: {
            'Content-Type': 'application/json'
            },
        body: JSON.stringify(userData) 
    })

    if (!response.ok) 
        throw new Error(`HTTP error: ${response.status}`);
    
    const responseData =  await response.json();
    if (typeof responseData !== 'object')
        throw new Error(`Err: ${responseData}`);
    
    reviewUserAttempt(responseData.correctAnswers);
    updateReviewBox(responseData.questions.length, responseData.score, responseData.scoreText);
    changeScreen(section[2], section[3]);
}

// highlight and comment correct answer, correct option, and wrong option
function reviewUserAttempt(correctAnswers) {
    for (const questionId in correctAnswers) {
        const currentQuestion = reviewQuestionList.querySelector(`[class="${questionId}"]`);
        let questionAnswer = currentQuestion.querySelector(".option");
        while (questionAnswer) {
            const radioBtn = questionAnswer.querySelector("input");
            radioBtn.disabled = true;
            if (radioBtn.checked === true) {
                questionAnswer.classList.remove("option-selected");    
                if (String(radioBtn.value) === String(correctAnswers[questionId])) {
                    questionAnswer.classList.add("correct-answer");
                    questionAnswer.appendChild(createComment("Correct answer"));
                }
                else {
                    questionAnswer.classList.add("wrong-answer");
                    questionAnswer.appendChild(createComment("Your answer"));
                }
            }
            else if (String(radioBtn.value) === String(correctAnswers[questionId])) {
                questionAnswer.classList.add("option-correct");
                questionAnswer.appendChild(createComment("Correct answer"));
            }   
            questionAnswer = questionAnswer.nextElementSibling; 
        }
    }
}

// update score, percentage, and text comment
function updateReviewBox(numberOfQuestions, score, text) {
    const userScore = document.querySelector("#score");
    userScore.textContent = `${String(score)}/${String(numberOfQuestions)}`;
    const scoreText = document.querySelector("#scoreText");
    scoreText.textContent = `${text}`;
    const percentage = document.querySelector("#percentage > strong");
    percentage.textContent = `${String(score/numberOfQuestions*100)}%`;
}

// create a comment
function createComment(commentText) {
    const comment = document.createElement("span");
    comment.classList.add("comment");
    comment.textContent = `${commentText}`;
    return comment;
}









