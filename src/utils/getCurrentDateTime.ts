import * as dayjs from "dayjs";

function getCurrentDateTime(): string {
    return dayjs().format('YYYY-MM-DD HH:mm');
}

export default getCurrentDateTime