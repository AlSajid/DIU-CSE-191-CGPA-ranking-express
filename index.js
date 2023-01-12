import express from 'express';
import { MongoClient } from "mongodb";
import fetch from 'sync-fetch';
import cors from 'cors';
const app = express()
const port = 3000
app.use(cors())
app.use(express.json())


// Replace the uri string with your connection string.
const uri = "mongodb+srv://AlSajid:Te6ID2cDdypEDQZS@ranking.hzaflbj.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);


const range = []

const semesterId =
    [
        191, 192, 193,
        201, 202, 203,
        211, 212, 213,
        221, 222, 223,
    ]





async function run() {
    try {
        const database = client.db('Ranking');
        const results = database.collection('191');
        const errors = database.collection('error');
        // const test = database.collection('test')


        app.get('/check', async (request, response) => {


            for (let start = range[0]; start <= range[1]; start++) {
                let info = null;
                const result = []

                const api = `http://software.diu.edu.bd:8189/result/studentInfo?studentId=191-15-${start}`;
                console.log(api)

                try {
                    info = fetch(api).json()

                    for (let i = 0; i < semesterId.length; i++) {
                        const api = `http://software.diu.edu.bd:8189/result?grecaptcha=&semesterId=${semesterId[i]}&studentId=191-15-${start}`;

                        let data = null;

                        try {
                            data = fetch(api).json()
                            result.push(...data)

                        }
                        catch (error) {
                            await errors.insertOne({ error: error, studentID: `191-15-${start}`, api: api });
                            console.log(error)
                        }
                    }


                }
                catch (error) {
                    await errors.insertOne({ error: error, studentID: `191-15-${start}`, api: api });
                    console.log(error)
                }

                if (info !== null) {
                    const inserted = await results.insertOne({ ...info, result: [...result] });
                    console.log(inserted)
                }
            }



            response.send('done')
        })

        app.get('/', async (request, response) => {
            response.json("connected")
        })

        app.get('/cgpa', async (request, response) => {


            const query = {};
            const options = {
                // sort: { studentID: 1 },
                // projection: { _id: 0, studentID: 1, result: 1 },
            };
            const cursor = results.find(query, options);

            const students = await cursor.toArray();

            const result = students.map(async student => {
                let credit = 0;
                let gpa = 0;



                const cgpa = student.result.map(async semester => {
                    credit += semester.totalCredit;
                    gpa += semester.totalCredit * semester.pointEquivalent;


                    // console.log(semester.totalCredit)
                    // console.log(semester.pointEquivalent)

                })

                if (credit === 142 && student.result.length === 71) {
                    const filter = { studentId: student.studentId }
                    const update = { $set: { cgpa: gpa / credit } };
                    console.log(student.studentId);
                    const updated = await results.updateOne(filter, update);
                    console.log(updated);
                }
            })

            response.json("result")

        })

        app.post('/ranking', async (request, response) => {
            // const token = request.body.token;
            // if (token === "sajid") {
            //     const query = {};
            //     const options = {
            //         sort: { cgpa: -1 },
            //         projection: { studentId: 1, cgpa: 1, studentName: 1, campusName: 1 },
            //     };
            //     const cursor = results.find(query, options);
            //     const students = await cursor.toArray();
            //     response.json(students)
            // } else {
            //     response.status(401).json("unauthorized")
            // }
            response.json("done")

        })
        app.get('/serial', async (request, response) => {
            const query = {};
            const options = {
                sort: { studentId: 1 },
                projection: { studentId: 1, cgpa: 1, studentName: 1, campusName: 1 },
            };
            const cursor = results.find(query, options);
            const students = await cursor.toArray();
            response.json(students)
        })

        app.get('/retake', async (request, response) => {
            const query = {};
            const cursor = results.find(query);
            const students = await cursor.toArray();

            students.map(async student => {
                let credit = 0;
                console.log(student.studentId)

                student.result.map(async course => {
                    credit += course.totalCredit;
                })

                const updatedResult = []

                const updateResult = (update) => {

                    for (let i = 0; i < updatedResult.length; i++) {
                        if (updatedResult[i].customCourseId === update.customCourseId) {
                            if (updatedResult[i].pointEquivalent < update.pointEquivalent) {
                                updatedResult[i].pointEquivalent = update.pointEquivalent
                            }
                            return
                        }
                    }
                    updatedResult.push(update)
                }

                if (credit > 142 && student.result.length > 71) {

                    for (let i = 0; i < student.result.length; i++) {
                        updateResult(student.result[i])
                    }

                    const filter = { studentId: student.studentId }
                    const update = { $set: { result: updatedResult } };

                    const updated = await results.updateOne(filter, update);
                    console.log(updated);

                }

            })

            response.json("done")
        })

        app.get('/id', async (request, response) => {
            const studentId = "191-15-2391"
            let info = null;
            const result = []

            const api = `http://software.diu.edu.bd:8189/result/studentInfo?studentId=${studentId}`;
            console.log(api)

            try {
                info = fetch(api).json()

                for (let i = 0; i < semesterId.length; i++) {
                    const api = `http://software.diu.edu.bd:8189/result?grecaptcha=&semesterId=${semesterId[i]}&studentId=${studentId}`;

                    let data = null;

                    try {
                        data = fetch(api).json()
                        result.push(...data)

                    }
                    catch (error) {
                        console.log(error)
                    }
                }
            }
            catch (error) {
                console.log(error)
            }

            if (info !== null) {
                const inserted = await results.insertOne({ ...info, result: [...result] });
                console.log(inserted)
            }

            response.json("done")
        })

        app.get('/update', async (request, response) => {
            const query = {};
            const cursor = results.find(query);
            const students = await cursor.toArray();

            const underCredit = []
            students.map(async student => {
                let credit = 0;

                student.result.map(async course => {
                    credit += course.totalCredit;
                })

                if (credit < 142 || student.result.length < 71) {
                    console.log(student.studentId)
                    console.log(credit)
                    underCredit.push(student.studentId)
                }
            })


            for (let start = 0; start < underCredit.length; start++) {
                let info = null;
                const result = []



                const api = `http://software.diu.edu.bd:8189/result/studentInfo?studentId=${underCredit[start]}`;
                console.log(api)

                try {
                    info = fetch(api).json()

                    for (let i = 0; i < semesterId.length; i++) {
                        const api = `http://software.diu.edu.bd:8189/result?grecaptcha=&semesterId=${semesterId[i]}&studentId=${underCredit[start]}`;
                        // console.log(api)
                        let data = null;

                        try {
                            data = fetch(api).json()
                            result.push(...data)

                        }
                        catch (error) {
                            console.log(error)
                        }
                    }


                }
                catch (error) {
                    console.log(error)
                }

                if (info !== null) {
                    // const inserted = await results.insertOne({ ...info, result: [...result] });
                    // console.log(inserted)

                    const filter = { studentId: underCredit[start] }
                    const update = { $set: { result: [...result] } };

                    const updated = await results.updateOne(filter, update);
                    console.log(updated);
                    // console.log(result.length)
                }
            }



            response.json(underCredit)

        })





    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})